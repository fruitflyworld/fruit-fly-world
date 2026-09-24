// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/FlyNFT.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8, bytes32, bytes32);
    function prank(address sender) external;
    function expectRevert(bytes4 selector) external;
    function warp(uint256 timestamp) external;
    function startPrank(address sender) external;
    function stopPrank() external;
}

contract FlyNFTHarness is FlyNFT {
    constructor(address initialOwner, address initialSigner, bytes32 campaignId, string memory initialBaseURI)
        FlyNFT(initialOwner, initialSigner, campaignId, initialBaseURI) {}

    function forceTotalSupply(uint256 supply) external { totalSupply = supply; }
}

contract FlyNFTTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant SIGNER_KEY = 0xA11CE;
    bytes32 private constant CAMPAIGN = keccak256("genesis-flies");
    FlyNFT private flies;
    address private signer;
    address private alice;
    address private bob;

    function setUp() public {
        signer = vm.addr(SIGNER_KEY);
        alice = vm.addr(0xB0B);
        bob = vm.addr(0xCAFE);
        flies = new FlyNFT(address(this), signer, CAMPAIGN, "https://fruitfly.world/api/fly/");
        flies.setMintPaused(false);
    }

    function _voucher(address recipient, bytes32 nonce) internal view returns (FlyNFT.FlyVoucher memory) {
        return FlyNFT.FlyVoucher({
            recipient: recipient,
            campaignId: CAMPAIGN,
            nonce: nonce,
            deadline: block.timestamp + 1 hours,
            seed: 42,
            brain: 1,
            g0: 550000, g1: 620000, g2: 480000, g3: 510000, g4: 700000
        });
    }

    function _sign(FlyNFT.FlyVoucher memory voucher) internal returns (bytes memory) {
        bytes32 digest = flies.voucherDigest(voucher);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_KEY, digest);
        return abi.encodePacked(r, s, v);
    }

    function _mintTo(address recipient, bytes32 nonce) internal returns (uint256) {
        FlyNFT.FlyVoucher memory voucher = _voucher(recipient, nonce);
        bytes memory signature = _sign(voucher);
        vm.prank(recipient);
        return flies.mint(voucher, signature);
    }

    function testMintStoresImmutableLineage() public {
        uint256 id = _mintTo(alice, keccak256("one"));
        require(id == 1 && flies.ownerOf(1) == alice, "mint");
        FlyNFT.Lineage memory lineage = _lineage(1);
        require(lineage.seed == 42 && lineage.brain == 1, "seed/brain");
        require(lineage.g0 == 550000 && lineage.g4 == 700000, "genes");
    }

    function testRejectsBadSignatureAndReplay() public {
        FlyNFT.FlyVoucher memory voucher = _voucher(alice, keccak256("one"));
        // wrong key signs
        bytes32 digest = flies.voucherDigest(voucher);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xDEAD, digest);
        bytes memory forged = abi.encodePacked(r, s, v);
        vm.expectRevert(FlyNFT.InvalidSignature.selector);
        vm.prank(alice);
        flies.mint(voucher, forged);

        // replay of a valid mint
        uint256 id = _mintTo(alice, keccak256("one"));
        require(id == 1, "first mint");
        FlyNFT.FlyVoucher memory replay = _voucher(alice, keccak256("one"));
        bytes memory replaySignature = _sign(replay);
        vm.expectRevert(FlyNFT.AlreadyUsed.selector);
        vm.prank(alice);
        flies.mint(replay, replaySignature);
    }

    function testRejectsForeignCampaign() public {
        FlyNFT.FlyVoucher memory voucher = _voucher(alice, keccak256("one"));
        voucher.campaignId = keccak256("other");
        bytes memory signature = _sign(voucher);
        vm.expectRevert(FlyNFT.InvalidCampaign.selector);
        vm.prank(alice);
        flies.mint(voucher, signature);
    }

    function testFliesTransferFreely() public {
        _mintTo(alice, keccak256("one"));
        vm.prank(alice);
        flies.transferFrom(alice, bob, 1);
        require(flies.ownerOf(1) == bob, "owner");
        require(flies.balanceOf(alice) == 0 && flies.balanceOf(bob) == 1, "balances");
    }

    function testTransferRequiresApproval() public {
        _mintTo(alice, keccak256("one"));
        vm.expectRevert(FlyNFT.NotApprovedOrOwner.selector);
        vm.prank(bob);
        flies.transferFrom(alice, bob, 1);

        vm.prank(alice);
        flies.approve(bob, 1);
        vm.prank(bob);
        flies.transferFrom(alice, bob, 1);
        require(flies.ownerOf(1) == bob, "approved transfer");
    }

    function testRaceLockBlocksTransferUntilUnlocked() public {
        _mintTo(alice, keccak256("one"));
        flies.setRecorder(address(this));
        flies.lockForRace(1, 7);

        vm.expectRevert(FlyNFT.EntryLocked.selector);
        vm.prank(alice);
        flies.transferFrom(alice, bob, 1);

        // only the locking race (the recorder here) can unlock
        flies.unlockFromRace(1);
        (uint64 week, address race) = flies.raceLock(1);
        require(week == 0 && race == address(0), "unlocked");
        vm.prank(alice);
        flies.transferFrom(alice, bob, 1);
        require(flies.ownerOf(1) == bob, "transfer after unlock");
    }

    function testOnlyRecorderLocksAndUpdates() public {
        _mintTo(alice, keccak256("one"));
        vm.expectRevert(FlyNFT.NotRecorder.selector);
        flies.lockForRace(1, 7);

        vm.expectRevert(FlyNFT.NotRecorder.selector);
        flies.updateRecord(1, 1, 0, 5, 2);

        flies.setRecorder(address(this));
        flies.updateRecord(1, 1, 0, 5, 2);
        flies.updateRecord(1, 1, 1, 7, 1);
        FlyNFT.Record memory record = _record(1);
        require(record.races == 2 && record.wins == 1, "races/wins");
        require(record.totalEggs == 12, "eggs");
        require(record.bestGens == 2, "bestGens keeps max, not last");
    }

    function testLineageCannotBeRewritten() public {
        _mintTo(alice, keccak256("one"));
        // no function exists to change lineageOf — verified by reading it back
        FlyNFT.Lineage memory lineage = _lineage(1);
        bytes32 before = keccak256(abi.encode(lineage));
        flies.setRecorder(address(this));
        flies.updateRecord(1, 1, 0, 5, 2); // record writes must not touch lineage
        FlyNFT.Lineage memory afterLineage = _lineage(1);
        require(keccak256(abi.encode(afterLineage)) == before, "lineage changed");
    }

    function testSoldOut() public {
        FlyNFTHarness harness = new FlyNFTHarness(address(this), signer, CAMPAIGN, "x/");
        harness.setMintPaused(false);
        harness.forceTotalSupply(harness.MAX_SUPPLY());
        FlyNFT.FlyVoucher memory voucher = FlyNFT.FlyVoucher({
            recipient: alice, campaignId: CAMPAIGN, nonce: keccak256("last"),
            deadline: block.timestamp + 1 hours,
            seed: 1, brain: 0, g0: 1, g1: 1, g2: 1, g3: 1, g4: 1
        });
        bytes memory signature = _signHarness(harness, voucher);
        vm.expectRevert(FlyNFT.SoldOut.selector);
        vm.prank(alice);
        harness.mint(voucher, signature);
    }

    function _lineage(uint256 id) internal view returns (FlyNFT.Lineage memory l) {
        (l.seed, l.brain, l.g0, l.g1, l.g2, l.g3, l.g4) = flies.lineageOf(id);
    }

    function _record(uint256 id) internal view returns (FlyNFT.Record memory r) {
        (r.races, r.wins, r.totalEggs, r.bestGens) = flies.recordOf(id);
    }

    function _signHarness(FlyNFT target, FlyNFT.FlyVoucher memory voucher) internal returns (bytes memory) {
        bytes32 digest = target.voucherDigest(voucher);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_KEY, digest);
        return abi.encodePacked(r, s, v);
    }
}
