// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/FlyNFT.sol";
import "../src/FlyToken.sol";
import "../src/WeeklyRace.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8, bytes32, bytes32);
    function prank(address sender) external;
    function expectRevert(bytes4 selector) external;
    function warp(uint256 timestamp) external;
}

contract WeeklyRaceTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant SIGNER_KEY = 0xA11CE;
    bytes32 private constant CAMPAIGN = keccak256("genesis-flies");
    bytes32 private constant DRAW_SEED = keccak256("block 123456");
    uint256 private constant FEE = 10 ether;

    FlyNFT private flies;
    FlyToken private token;
    WeeklyRace private race;
    address private signer;
    address private alice;
    address private bob;

    function setUp() public {
        signer = vm.addr(SIGNER_KEY);
        alice = vm.addr(0xB0B);
        bob = vm.addr(0xCAFE);
        flies = new FlyNFT(address(this), signer, CAMPAIGN, "https://fruitfly.world/api/fly/");
        flies.setMintPaused(false);
        token = new FlyToken(address(this)); // owner holds the whole pool
        race = new WeeklyRace(address(flies), address(token), address(this));
        flies.setRecorder(address(race));
        race.setEntryFee(FEE);
        token.transfer(alice, 1000 ether);
        token.transfer(bob, 1000 ether);

        _mintFly(alice, 1);
        _mintFly(bob, 2);
    }

    function _mintFly(address recipient, uint64 seed) internal {
        FlyNFT.FlyVoucher memory voucher = FlyNFT.FlyVoucher({
            recipient: recipient, campaignId: CAMPAIGN, nonce: bytes32(uint256(seed)),
            deadline: block.timestamp + 1 hours,
            seed: seed, brain: 1, g0: 550000, g1: 620000, g2: 480000, g3: 510000, g4: 700000
        });
        bytes32 digest = flies.voucherDigest(voucher);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_KEY, digest);
        vm.prank(recipient);
        flies.mint(voucher, abi.encodePacked(r, s, v));
    }

    function _entry(uint64 week, uint256 flyId) internal view returns (WeeklyRace.Entry memory e) {
        (e.entrant, e.commitment, e.scoredAt, e.revealed) = race.entryOf(week, flyId);
    }

    function _record(uint256 id) internal view returns (FlyNFT.Record memory r) {
        (r.races, r.wins, r.totalEggs, r.bestGens) = flies.recordOf(id);
    }

    function _commit(address entrant, uint256 flyId, bytes32 policyHash) internal {
        vm.prank(entrant);
        token.approve(address(race), FEE);
        vm.prank(entrant);
        race.commit(flyId, policyHash);
    }

    function testCommitBurnsFeeAndLocksFly() public {
        uint256 aliceBefore = token.balanceOf(alice);
        uint256 supplyBefore = token.totalSupply();
        _commit(alice, 1, keccak256("policy-a"));

        require(token.balanceOf(alice) == aliceBefore - FEE, "fee not taken");
        require(token.totalSupply() == supplyBefore - FEE, "fee not burned");
        (uint64 week, address lockRace) = flies.raceLock(1);
        require(lockRace == address(race) && week == race.currentWeek(), "not locked");

        WeeklyRace.Entry memory entry = _entry(race.currentWeek(), 1);
        require(entry.entrant == alice, "entrant");
        require(entry.commitment == keccak256("policy-a"), "commitment");
    }

    function testOneEntryPerFlyPerWeek() public {
        _commit(alice, 1, keccak256("policy-a"));
        vm.prank(alice);
        token.approve(address(race), FEE);
        vm.expectRevert(WeeklyRace.AlreadyEntered.selector);
        vm.prank(alice);
        race.commit(1, keccak256("policy-b"));
    }

    function testOnlyOwnerMayCommitFly() public {
        vm.expectRevert(WeeklyRace.NotOwner.selector);
        vm.prank(bob);
        race.commit(1, keccak256("steal"));
    }

    function testCommitThenDrawThenReveal() public {
        bytes32 policyHash = keccak256("policy-a");
        _commit(alice, 1, policyHash);

        // reveal before the draw is refused
        vm.expectRevert(WeeklyRace.DrawTooEarly.selector);
        vm.prank(alice);
        race.reveal(1, "policy-a");

        // the paper is drawn after the cutoff: a future week cannot be drawn
        uint64 week = race.currentWeek();
        vm.expectRevert(WeeklyRace.DrawTooEarly.selector);
        race.setDrawSeed(week + 1, DRAW_SEED, "block");

        race.setDrawSeed(week, DRAW_SEED, "robinhoodchain block 123456");
        require(race.drawSeedOf(week) == DRAW_SEED, "seed");

        // wrong policy does not match the commitment
        vm.expectRevert(WeeklyRace.CommitmentMismatch.selector);
        vm.prank(alice);
        race.reveal(1, "policy-b");

        vm.prank(alice);
        race.reveal(1, "policy-a");
        WeeklyRace.Entry memory entry = _entry(week, 1);
        require(entry.revealed, "revealed");
    }

    function testGradingPaysWithinPoolCapAndRecords() public {
        bytes32 policyHash = keccak256("policy-a");
        _commit(alice, 1, policyHash);
        _commit(bob, 2, keccak256("policy-b"));
        uint64 week = race.currentWeek();
        race.setDrawSeed(week, DRAW_SEED, "block");
        vm.prank(alice);
        race.reveal(1, "policy-a");
        vm.prank(bob);
        race.reveal(2, "policy-b");

        // grading without a pool cap is refused
        vm.expectRevert(WeeklyRace.PoolNotSet.selector);
        race.recordResult(1, 100, 34, 3, 1, 50 ether);

        race.setWeekPool(week, 100 ether);
        token.transfer(address(race), 100 ether);

        uint256 aliceBefore = token.balanceOf(alice);
        race.recordResult(1, 100, 34, 3, 1, 50 ether);

        require(token.balanceOf(alice) == aliceBefore + 50 ether, "reward");
        FlyNFT.Record memory record = _record(1);
        require(record.races == 1 && record.wins == 1 && record.totalEggs == 34 && record.bestGens == 3, "record");
        (, address lockRace) = flies.raceLock(1);
        require(lockRace == address(0), "fly not released");
        require(race.paidOut(week) == 50 ether, "paidOut");

        // the pool cap bounds the week
        vm.expectRevert(WeeklyRace.RewardExceedsPool.selector);
        race.recordResult(2, 90, 21, 3, 0, 51 ether);
        race.recordResult(2, 90, 21, 3, 0, 50 ether);
        require(race.paidOut(week) == 100 ether, "cap reached");
    }

    function testUnrevealedOrDoubleScoredRejected() public {
        _commit(alice, 1, keccak256("policy-a"));
        uint64 week = race.currentWeek();
        race.setDrawSeed(week, DRAW_SEED, "block");
        race.setWeekPool(week, 100 ether);
        token.transfer(address(race), 100 ether);

        vm.expectRevert(WeeklyRace.NotRevealed.selector);
        race.recordResult(1, 100, 34, 3, 1, 10 ether);

        vm.prank(alice);
        race.reveal(1, "policy-a");
        race.recordResult(1, 100, 34, 3, 1, 10 ether);
        vm.expectRevert(WeeklyRace.AlreadyScored.selector);
        race.recordResult(1, 100, 34, 3, 1, 10 ether);
    }

    function testAbortReleasesFlyWithoutReward() public {
        _commit(alice, 1, keccak256("policy-a"));
        uint64 week = race.currentWeek();
        race.abortEntry(1);

        (, address lockRace) = flies.raceLock(1);
        require(lockRace == address(0), "released");
        WeeklyRace.Entry memory entry = _entry(week, 1);
        require(entry.scoredAt == week + 1, "closed");
        require(_record(1).races == 0, "no record");
        require(token.balanceOf(alice) == 1000 ether - FEE, "fee stays burned");
    }

    function testWeeksAdvanceAndFlyCanReenter() public {
        _commit(alice, 1, keccak256("policy-a"));
        uint64 week = race.currentWeek();
        race.setDrawSeed(week, DRAW_SEED, "block");
        race.setWeekPool(week, 100 ether);
        token.transfer(address(race), 100 ether);
        vm.prank(alice);
        race.reveal(1, "policy-a");
        race.recordResult(1, 100, 34, 3, 1, 0);

        // one week later the same fly may enter again
        vm.warp(block.timestamp + 7 days + 1);
        require(race.currentWeek() == week + 1, "week");
        _commit(alice, 1, keccak256("policy-a2"));
        WeeklyRace.Entry memory entry = _entry(week + 1, 1);
        require(entry.entrant == alice, "re-entered");
    }
}
