// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external returns (bytes4);
}

/// @title FlyNFT — one NFT, one lineage.
/// @notice Unlike the soul-bound Passport, a Fly is property: it transfers
///         freely, and its worth is its genes plus its racing record. The
///         lineage (seed, brain, five gene weights) is fixed at mint and can
///         never change — that is what makes a committed fly verifiable: the
///         world replays deterministically from the lineage, forever. The
///         record (races, wins, eggs) is append-only statistics, writable
///         solely by the recorder (the race contract).
/// @dev Self-contained tradable ERC-721 (no OpenZeppelin). Genesis mint uses
///      the same EIP-712 voucher pattern as FruitFlyPassport.
contract FlyNFT {
    error AlreadyUsed();
    error EntryLocked();
    error Expired();
    error InvalidCampaign();
    error InvalidRecipient();
    error InvalidSignature();
    error LineageFrozen();
    error MintPaused();
    error NotApprovedOrOwner();
    error NotOwner();
    error NotRecorder();
    error NotPendingOwner();
    error SoldOut();
    error UnsafeRecipient();
    error ZeroAddress();

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event MintSignerUpdated(address indexed previousSigner, address indexed newSigner);
    event MintPausedUpdated(bool paused);
    event RecorderUpdated(address indexed previousRecorder, address indexed newRecorder);
    event FlyMinted(address indexed recipient, uint256 indexed tokenId);
    event RecordUpdated(uint256 indexed tokenId, uint32 races, uint32 wins, uint64 totalEggs, uint32 bestGens);
    event RaceLockUpdated(uint256 indexed tokenId, uint64 indexed week, address indexed race);
    event BaseURIUpdated(string baseURI);

    string public constant name = "Fruit Fly";
    string public constant symbol = "FFLY";
    uint256 public constant MAX_SUPPLY = 4444;

    bytes32 public constant VOUCHER_TYPEHASH = keccak256(
        "FlyVoucher(address recipient,bytes32 campaign,bytes32 nonce,uint256 deadline,uint64 seed,uint8 brain,uint64 g0,uint64 g1,uint64 g2,uint64 g3,uint64 g4)"
    );
    bytes32 private constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant NAME_HASH = keccak256("Fruit Fly");
    bytes32 private constant VERSION_HASH = keccak256("1");
    uint256 private constant SECP256K1N_HALF =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    /// @notice The lineage — immutable after mint. Gene weights are the same
    ///         numbers the world uses, scaled by 1e6 (0.55 → 550000).
    struct Lineage {
        uint64 seed;   // origin seed the lineage was bred from
        uint8 brain;   // 0 genes / 1 circuit / 2 judgment — the brain slot
        uint64 g0;     // gene weight 0 … scaled 1e6
        uint64 g1;
        uint64 g2;
        uint64 g3;
        uint64 g4;
    }

    /// @notice The record — cumulative racing statistics, recorder-writable.
    struct Record {
        uint32 races;
        uint32 wins;
        uint64 totalEggs;
        uint32 bestGens;
    }

    bytes32 public immutable campaign;
    address public owner;
    address public pendingOwner;
    address public mintSigner;
    address public recorder;
    bool public mintPaused = true;
    uint256 public totalSupply;
    string private _baseTokenURI;

    mapping(uint256 => Lineage) public lineageOf;
    mapping(uint256 => Record) public recordOf;
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => address) private _getApproved;
    mapping(address => mapping(address => bool)) private _isApprovedForAll;
    mapping(bytes32 => bool) public usedNonces;
    /// @dev tokenId → week it is entered in. address(0) marker = free; a race
    ///      contract address = locked. Packed as (week, race) so the lock
    ///      names its owner: only that race can unlock.
    mapping(uint256 => uint64) private _lockWeek;
    mapping(uint256 => address) private _lockRace;

    struct FlyVoucher {
        address recipient;
        bytes32 campaignId;
        bytes32 nonce;
        uint256 deadline;
        uint64 seed;
        uint8 brain;
        uint64 g0;
        uint64 g1;
        uint64 g2;
        uint64 g3;
        uint64 g4;
    }

    constructor(address initialOwner, address initialSigner, bytes32 campaignId, string memory initialBaseURI) {
        if (initialOwner == address(0) || initialSigner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        mintSigner = initialSigner;
        campaign = campaignId;
        _baseTokenURI = initialBaseURI;
        emit OwnershipTransferred(address(0), initialOwner);
        emit MintSignerUpdated(address(0), initialSigner);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice Genesis mint. The voucher carries the whole lineage, signed by
    ///         the server, so genes are chosen before the fly exists and can
    ///         never be edited afterwards.
    function mint(FlyVoucher calldata voucher, bytes calldata signature) external returns (uint256 tokenId) {
        if (mintPaused) revert MintPaused();
        if (voucher.recipient != msg.sender) revert InvalidRecipient();
        if (voucher.campaignId != campaign) revert InvalidCampaign();
        if (block.timestamp > voucher.deadline) revert Expired();
        if (usedNonces[voucher.nonce]) revert AlreadyUsed();
        if (_recover(_voucherDigest(voucher), signature) != mintSigner) revert InvalidSignature();

        usedNonces[voucher.nonce] = true;
        tokenId = _mintFly(voucher.recipient, Lineage({
            seed: voucher.seed, brain: voucher.brain,
            g0: voucher.g0, g1: voucher.g1, g2: voucher.g2, g3: voucher.g3, g4: voucher.g4
        }));
    }

    // ----- tradable ERC-721 -----

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _balanceOf[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address tokenOwner) {
        tokenOwner = _ownerOf[tokenId];
        if (tokenOwner == address(0)) revert InvalidRecipient();
    }

    function approve(address spender, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        if (msg.sender != tokenOwner && !_isApprovedForAll[tokenOwner][msg.sender]) revert NotApprovedOrOwner();
        _getApproved[tokenId] = spender;
        emit Approval(tokenOwner, spender, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        ownerOf(tokenId);
        return _getApproved[tokenId];
    }

    function isApprovedForAll(address holder, address operator) external view returns (bool) {
        return _isApprovedForAll[holder][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (to == address(0)) revert ZeroAddress();
        address tokenOwner = ownerOf(tokenId);
        if (tokenOwner != from) revert InvalidRecipient();
        if (msg.sender != tokenOwner && msg.sender != _getApproved[tokenId] && !_isApprovedForAll[tokenOwner][msg.sender]) {
            revert NotApprovedOrOwner();
        }
        if (_lockRace[tokenId] != address(0)) revert EntryLocked();

        _balanceOf[from]--;
        _balanceOf[to]++;
        _ownerOf[tokenId] = to;
        delete _getApproved[tokenId];
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
        _checkReceiver(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external {
        transferFrom(from, to, tokenId);
        _checkReceiver(from, to, tokenId, data);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        return string.concat(_baseTokenURI, _toString(tokenId));
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f;
    }

    // ----- race lock: a fly entered in a week cannot change hands -----

    /// @notice Called by the recorder (race contract) when a fly is committed
    ///         to a week. Locked flies cannot transfer until the race unlocks.
    function lockForRace(uint256 tokenId, uint64 week) external {
        if (msg.sender != recorder) revert NotRecorder();
        if (_lockRace[tokenId] != address(0)) revert EntryLocked();
        _lockWeek[tokenId] = week;
        _lockRace[tokenId] = msg.sender;
        emit RaceLockUpdated(tokenId, week, msg.sender);
    }

    /// @notice Called by the same race contract to release the fly once its
    ///         week is graded.
    function unlockFromRace(uint256 tokenId) external {
        if (msg.sender != recorder || _lockRace[tokenId] != msg.sender) revert NotRecorder();
        emit RaceLockUpdated(tokenId, _lockWeek[tokenId], address(0));
        _lockWeek[tokenId] = 0;
        _lockRace[tokenId] = address(0);
    }

    function raceLock(uint256 tokenId) external view returns (uint64 week, address race) {
        ownerOf(tokenId);
        return (_lockWeek[tokenId], _lockRace[tokenId]);
    }

    // ----- the record: recorder-writable, lineage never -----

    /// @notice Append a race outcome to the fly's record. Only the recorder
    ///         (the live race contract) may call; genes stay frozen.
    function updateRecord(uint256 tokenId, uint32 racesDelta, uint32 winsDelta, uint64 eggsDelta, uint32 bestGensIfBetter)
        external
    {
        if (msg.sender != recorder) revert NotRecorder();
        Record storage r = recordOf[tokenId];
        r.races += racesDelta;
        r.wins += winsDelta;
        r.totalEggs += eggsDelta;
        if (bestGensIfBetter > r.bestGens) r.bestGens = bestGensIfBetter;
        emit RecordUpdated(tokenId, r.races, r.wins, r.totalEggs, r.bestGens);
    }

    // ----- admin -----

    function setMintPaused(bool paused) external onlyOwner {
        mintPaused = paused;
        emit MintPausedUpdated(paused);
    }

    function setMintSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        emit MintSignerUpdated(mintSigner, newSigner);
        mintSigner = newSigner;
    }

    function setRecorder(address newRecorder) external onlyOwner {
        emit RecorderUpdated(recorder, newRecorder);
        recorder = newRecorder;
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address previousOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, msg.sender);
    }

    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // ----- internals -----

    function _mintFly(address recipient, Lineage memory lineage) private returns (uint256 tokenId) {
        if (totalSupply >= MAX_SUPPLY) revert SoldOut();
        tokenId = ++totalSupply;
        lineageOf[tokenId] = lineage;
        _ownerOf[tokenId] = recipient;
        _balanceOf[recipient]++;
        emit Transfer(address(0), recipient, tokenId);
        emit FlyMinted(recipient, tokenId);
    }

    function _checkReceiver(address from, address to, uint256 tokenId) private {
        _checkReceiver(from, to, tokenId, "");
    }

    function _checkReceiver(address from, address to, uint256 tokenId, bytes memory data) private {
        if (to.code.length != 0) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 value) {
                if (value != IERC721Receiver.onERC721Received.selector) revert UnsafeRecipient();
            } catch { revert UnsafeRecipient(); }
        }
    }

    function voucherDigest(FlyVoucher calldata voucher) external view returns (bytes32) {
        return _voucherDigest(voucher);
    }

    function _voucherDigest(FlyVoucher calldata voucher) private view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            VOUCHER_TYPEHASH, voucher.recipient, voucher.campaignId, voucher.nonce, voucher.deadline,
            voucher.seed, voucher.brain,
            voucher.g0, voucher.g1, voucher.g2, voucher.g3, voucher.g4
        ));
        bytes32 domain = keccak256(abi.encode(
            DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this)
        ));
        return keccak256(abi.encodePacked("\x19\x01", domain, structHash));
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address recovered) {
        if (signature.length != 65) revert InvalidSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (uint256(s) > SECP256K1N_HALF || (v != 27 && v != 28)) revert InvalidSignature();
        recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0)) revert InvalidSignature();
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 digits;
        uint256 temp = value;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }
}
