// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IFlightNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function raceLock(uint256 tokenId) external view returns (uint64 week, address race);
    function lockForRace(uint256 tokenId, uint64 week) external;
    function unlockFromRace(uint256 tokenId) external;
    function updateRecord(uint256 tokenId, uint32 racesDelta, uint32 winsDelta, uint64 eggsDelta, uint32 bestGensIfBetter) external;
}

interface IFlightToken {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function burn(uint256 value) external;
    function balanceOf(address account) external view returns (uint256);
}

/// @title WeeklyRace — commit your fly, then the paper is drawn from a block.
/// @notice The fairness protocol, on chain:
///          1. COMMIT — before the draw, each entrant locks a fly and a
///             keccak256 hash of the exact policy (brain + draft rules) that
///             will play it. One fly, one entry, one week. The entry fee is
///             burned.
///          2. DRAW — after the commit cutoff, the exam seed is recorded,
///             sourced from a block hash produced after the cutoff, so nobody
///             — not even the operator — could have seen the paper first.
///          3. REVEAL — entrants publish their policy; the contract checks
///             it hashes to the commitment.
///          4. GRADE — the operator replays every entry with the pure world
///             module (same seed for all, deterministic to the bit) and
///             records results and rewards. Anyone can re-run the world and
///             check the operator, because lineage, policy hash, and seed are
///             all public here.
/// @dev Rewards are paid from this contract's FLY balance; the owner caps the
///      per-week pool up front, and payouts can never exceed the cap.
contract WeeklyRace {
    error AlreadyDrawn();
    error AlreadyEntered();
    error AlreadyRevealed();
    error AlreadyScored();
    error CommitmentMismatch();
    error DrawTooEarly();
    error EntryNotLocked();
    error NoEntry();
    error NotOwner();
    error NotRevealed();
    error PoolNotSet();
    error PoolExceeded();
    error RewardExceedsPool();
    error TransferFailed();
    error WrongRace();
    error ZeroAddress();
    error ZeroHash();

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event EntryFeeUpdated(uint256 previousFee, uint256 newFee);
    event Committed(uint256 indexed week, uint256 indexed flyId, address indexed entrant, bytes32 commitment);
    event DrawSeedSet(uint256 indexed week, bytes32 seed, string source);
    event WeekPoolSet(uint256 indexed week, uint256 cap);
    event Revealed(uint256 indexed week, uint256 indexed flyId, bytes32 policyHash);
    event Scored(
        uint256 indexed week, uint256 indexed flyId, address indexed entrant,
        uint32 score, uint64 eggs, uint32 gens, uint32 winsDelta, uint256 reward
    );
    event EntryAborted(uint256 indexed week, uint256 indexed flyId, address indexed entrant);

    uint256 public constant WEEK = 7 days;

    IFlightNFT public immutable flies;
    IFlightToken public immutable token;

    address public owner;
    address public pendingOwner;
    uint256 public entryFee;

    struct Entry {
        address entrant;
        bytes32 commitment;
        uint64 scoredAt; // 0 = live; otherwise week + 1 (week 0 scores as 1)
        bool revealed;
    }

    mapping(uint256 => mapping(uint256 => Entry)) public entryOf; // week → flyId
    mapping(uint256 => bytes32) public drawSeedOf;                 // week → seed
    mapping(uint256 => uint256) public weekPoolCap;                // week → max payout
    mapping(uint256 => uint256) public paidOut;                    // week → paid so far
    mapping(uint256 => uint64) public enteredWeekOf;               // flyId → week

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address flies_, address token_, address initialOwner) {
        if (flies_ == address(0) || token_ == address(0) || initialOwner == address(0)) revert ZeroAddress();
        flies = IFlightNFT(flies_);
        token = IFlightToken(token_);
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function currentWeek() public view returns (uint64) {
        return uint64(block.timestamp / WEEK);
    }

    // ----- 1. commit (before the draw) -----

    /// @notice Enter a fly for the current week. `commitment` must be
    ///         keccak256 of the policy bytes that will play the exam; the
    ///         policy is revealed only after the draw. The entry fee (FLY) is
    ///         burned, and the fly is locked — it cannot transfer until the
    ///         week is graded.
    function commit(uint256 flyId, bytes32 commitment) external {
        if (commitment == bytes32(0)) revert ZeroHash();
        if (flies.ownerOf(flyId) != msg.sender) revert NotOwner();
        uint64 week = currentWeek();
        if (entryOf[week][flyId].entrant != address(0)) revert AlreadyEntered();
        (, address lockRace) = flies.raceLock(flyId);
        if (lockRace != address(0)) revert EntryNotLocked(); // already in ANY race week

        if (entryFee > 0) {
            if (!token.transferFrom(msg.sender, address(this), entryFee)) revert TransferFailed();
            token.burn(entryFee);
        }

        entryOf[week][flyId] = Entry({entrant: msg.sender, commitment: commitment, scoredAt: 0, revealed: false});
        enteredWeekOf[flyId] = week;
        flies.lockForRace(flyId, week);
        emit Committed(week, flyId, msg.sender, commitment);
    }

    // ----- 2. draw (after the cutoff) -----

    /// @notice Record the exam seed for a past-or-current week, sourced from
    ///         a block mined after that week's commit cutoff. One-time.
    function setDrawSeed(uint64 week, bytes32 seed, string calldata source) external onlyOwner {
        if (week > currentWeek()) revert DrawTooEarly();
        if (drawSeedOf[week] != bytes32(0)) revert AlreadyDrawn();
        if (seed == bytes32(0)) revert ZeroHash();
        drawSeedOf[week] = seed;
        emit DrawSeedSet(week, seed, source);
    }

    /// @notice Cap the total rewards payable for a week. One-time per week.
    function setWeekPool(uint64 week, uint256 cap) external onlyOwner {
        if (week > currentWeek()) revert DrawTooEarly();
        if (weekPoolCap[week] != 0) revert PoolExceeded();
        weekPoolCap[week] = cap;
        emit WeekPoolSet(week, cap);
    }

    // ----- 3. reveal (after the draw) -----

    /// @notice Publish the policy that was committed. The contract verifies
    ///         it hashes to the commitment — a policy cannot be changed after
    ///         the paper was drawn.
    function reveal(uint256 flyId, bytes calldata policy) external {
        uint64 week = enteredWeekOf[flyId];
        Entry storage entry = entryOf[week][flyId];
        if (entry.entrant == address(0)) revert NoEntry();
        if (entry.entrant != msg.sender) revert NotOwner();
        if (entry.revealed) revert AlreadyRevealed();
        if (drawSeedOf[week] == bytes32(0)) revert DrawTooEarly();

        if (keccak256(policy) != entry.commitment) revert CommitmentMismatch();
        entry.revealed = true;
        emit Revealed(week, flyId, keccak256(policy));
    }

    // ----- 4. grade (after the replay) -----

    /// @notice Record one graded entry and pay its reward. Callable only by
    ///         the operator, and only for revealed, unscored entries; the
    ///         payout can never push the week past its pool cap. Grading is
    ///         verifiable: anyone can replay `world.js` with the week's seed
    ///         and the revealed policy.
    function recordResult(
        uint256 flyId,
        uint32 score,
        uint64 eggs,
        uint32 gens,
        uint32 winsDelta,
        uint256 reward
    ) external onlyOwner {
        uint64 week = enteredWeekOf[flyId];
        Entry storage entry = entryOf[week][flyId];
        if (entry.entrant == address(0)) revert NoEntry();
        if (!entry.revealed) revert NotRevealed();
        if (entry.scoredAt != 0) revert AlreadyScored();

        uint256 cap = weekPoolCap[week];
        if (reward > 0) {
            if (cap == 0) revert PoolNotSet();
            if (paidOut[week] + reward > cap) revert RewardExceedsPool();
        }

        entry.scoredAt = week + 1; // +1 so week 0 scores are distinguishable from "live"
        if (reward > 0) {
            paidOut[week] += reward;
            if (!token.transfer(entry.entrant, reward)) revert TransferFailed();
        }
        flies.updateRecord(flyId, 1, winsDelta, eggs, gens);
        flies.unlockFromRace(flyId);
        emit Scored(week, flyId, entry.entrant, score, eggs, gens, winsDelta, reward);
    }

    /// @notice Release a fly whose week will never be graded (draw missed,
    ///         insufficient entrants). No reward, no record.
    function abortEntry(uint256 flyId) external onlyOwner {
        uint64 week = enteredWeekOf[flyId];
        Entry storage entry = entryOf[week][flyId];
        if (entry.entrant == address(0)) revert NoEntry();
        if (entry.scoredAt != 0) revert AlreadyScored();
        (, address lockRace) = flies.raceLock(flyId);
        if (lockRace != address(this)) revert WrongRace();

        entry.scoredAt = week + 1; // closed without grading
        flies.unlockFromRace(flyId);
        emit EntryAborted(week, flyId, entry.entrant);
    }

    // ----- admin -----

    function setEntryFee(uint256 newFee) external onlyOwner {
        emit EntryFeeUpdated(entryFee, newFee);
        entryFee = newFee;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotOwner();
        address previousOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, msg.sender);
    }
}
