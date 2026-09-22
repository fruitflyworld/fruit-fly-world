// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/FruitFlyPassport.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8, bytes32, bytes32);
    function prank(address sender) external;
    function expectRevert(bytes4 selector) external;
    function warp(uint256 timestamp) external;
    function deal(address account, uint256 balance) external;
    function store(address target, bytes32 slot, bytes32 value) external;
}

contract FruitFlyPassportHarness is FruitFlyPassport {
    constructor(address initialOwner, address initialSigner, bytes32 campaignId, string memory initialBaseURI)
        FruitFlyPassport(initialOwner, initialSigner, campaignId, initialBaseURI) {}

    function forceTotalSupply(uint256 supply) external { totalSupply = supply; }
}

contract FruitFlyPassportTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant SIGNER_KEY = 0xA11CE;
    bytes32 private constant CAMPAIGN = keccak256("genesis");
    FruitFlyPassport private passport;
    address private signer;
    address private alice;
    address private bob;

    function setUp() public {
        signer = vm.addr(SIGNER_KEY);
        alice = vm.addr(0xB0B);
        bob = vm.addr(0xCAFE);
        passport = new FruitFlyPassport(address(this), signer, CAMPAIGN, "ipfs://passport/");
        passport.setMintPaused(false);
    }

    function testMintWithBoundVoucher() public {
        FruitFlyPassport.MintVoucher memory voucher = _voucher(alice, keccak256("one"), block.timestamp + 1 hours);
        bytes memory signature = _sign(voucher);
        vm.prank(alice);
        uint256 tokenId = passport.mint(voucher, signature);
        require(tokenId == 1 && passport.ownerOf(1) == alice, "mint failed");
        require(passport.hasMinted(alice), "wallet not consumed");
        require(passport.usedNonces(voucher.nonce), "nonce not consumed");
    }

    function testRejectsReplayAndSecondWalletMint() public {
        FruitFlyPassport.MintVoucher memory first = _voucher(alice, keccak256("one"), block.timestamp + 1 hours);
        bytes memory firstSignature = _sign(first);
        vm.prank(alice);
        passport.mint(first, firstSignature);
        vm.expectRevert(FruitFlyPassport.AlreadyUsed.selector);
        vm.prank(alice);
        passport.mint(first, firstSignature);

        FruitFlyPassport.MintVoucher memory second = _voucher(bob, first.nonce, block.timestamp + 1 hours);
        bytes memory secondSignature = _sign(second);
        vm.expectRevert(FruitFlyPassport.AlreadyUsed.selector);
        vm.prank(bob);
        passport.mint(second, secondSignature);
    }

    function testRejectsWrongRecipientExpiredAndWrongSigner() public {
        FruitFlyPassport.MintVoucher memory voucher = _voucher(alice, keccak256("one"), block.timestamp + 1 hours);
        bytes memory signature = _sign(voucher);
        vm.expectRevert(FruitFlyPassport.InvalidRecipient.selector);
        vm.prank(bob);
        passport.mint(voucher, signature);

        voucher.deadline = block.timestamp - 1;
        signature = _sign(voucher);
        vm.expectRevert(FruitFlyPassport.Expired.selector);
        vm.prank(alice);
        passport.mint(voucher, signature);

        voucher.deadline = block.timestamp + 1 hours;
        bytes32 digest = passport.voucherDigest(voucher);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xBAD, digest);
        vm.expectRevert(FruitFlyPassport.InvalidSignature.selector);
        vm.prank(alice);
        passport.mint(voucher, abi.encodePacked(r, s, v));
    }

    function testSoulboundAndPause() public {
        FruitFlyPassport.MintVoucher memory voucher = _voucher(alice, keccak256("one"), block.timestamp + 1 hours);
        bytes memory signature = _sign(voucher);
        passport.setMintPaused(true);
        vm.expectRevert(FruitFlyPassport.MintPaused.selector);
        vm.prank(alice);
        passport.mint(voucher, signature);
        passport.setMintPaused(false);
        vm.prank(alice);
        passport.mint(voucher, signature);
        vm.expectRevert(FruitFlyPassport.NonTransferable.selector);
        vm.prank(alice);
        passport.transferFrom(alice, bob, 1);
    }

    function testPaidAndMissionMintsShareWalletAndSupplyCaps() public {
        uint256 price = 0.002 ether;
        passport.setPublicMint(true, price);
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 paidId = passport.publicMint{value: price}();
        require(paidId == 1 && !passport.missionQualified(alice), "paid provenance wrong");

        FruitFlyPassport.MintVoucher memory voucher = _voucher(alice, keccak256("second"), block.timestamp + 1 hours);
        bytes memory signature = _sign(voucher);
        vm.prank(alice);
        uint256 activatedId = passport.mint(voucher, signature);
        require(activatedId == paidId && passport.missionQualified(alice), "activation failed");
        require(passport.totalSupply() == 1, "activation minted twice");

        voucher = _voucher(bob, keccak256("mission"), block.timestamp + 1 hours);
        signature = _sign(voucher);
        vm.prank(bob);
        uint256 missionId = passport.mint(voucher, signature);
        require(missionId == 2 && passport.missionQualified(bob), "mission provenance wrong");
        require(passport.MAX_SUPPLY() == 4444, "wrong supply");
    }

    function testSupplyCapAndSecondPaidMint() public {
        uint256 price = 0.002 ether;
        passport.setPublicMint(true, price);
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        passport.publicMint{value: price}();
        vm.expectRevert(FruitFlyPassport.AlreadyMinted.selector);
        vm.prank(alice);
        passport.publicMint{value: price}();

        FruitFlyPassportHarness capped = new FruitFlyPassportHarness(address(this), signer, CAMPAIGN, "ipfs://passport/");
        capped.setMintPaused(false);
        capped.setPublicMint(true, price);
        capped.forceTotalSupply(capped.MAX_SUPPLY());
        vm.deal(bob, price);
        vm.expectRevert(FruitFlyPassport.SoldOut.selector);
        vm.prank(bob);
        capped.publicMint{value: price}();
    }

    function testOwnerControlsAndWithdrawal() public {
        vm.expectRevert(FruitFlyPassport.NotOwner.selector);
        vm.prank(alice);
        passport.setPublicMint(true, 0.002 ether);

        passport.setPublicMint(true, 0.002 ether);
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        passport.publicMint{value: 0.002 ether}();
        uint256 beforeBalance = bob.balance;
        passport.withdraw(payable(bob));
        require(bob.balance == beforeBalance + 0.002 ether && address(passport).balance == 0, "withdraw failed");
    }

    function testPaidMintGuardsAndMetadataFreeze() public {
        uint256 price = 0.002 ether;
        vm.deal(alice, 1 ether);
        vm.expectRevert(FruitFlyPassport.PublicMintClosed.selector);
        vm.prank(alice);
        passport.publicMint{value: price}();

        passport.setPublicMint(true, price);
        vm.expectRevert(FruitFlyPassport.WrongPayment.selector);
        vm.prank(alice);
        passport.publicMint{value: price - 1}();

        passport.freezeMetadata();
        vm.expectRevert(FruitFlyPassport.MetadataIsFrozen.selector);
        passport.setBaseURI("ipfs://changed/");
    }

    function testParticipantPaysHalfTheStandardPrice() public {
        uint256 price = 0.002 ether;
        passport.setPublicMint(true, price);
        require(passport.participantPrice() == price / 2, "participant tier wrong");
        require(passport.mintPrice(false) == price, "standard tier wrong");

        vm.deal(alice, 1 ether);
        FruitFlyPassport.MintVoucher memory voucher =
            _tieredVoucher(alice, keccak256("half"), block.timestamp + 1 hours, true, false);
        bytes memory signature = _sign(voucher);

        vm.expectRevert(FruitFlyPassport.WrongPayment.selector);
        vm.prank(alice);
        passport.mint{value: price}(voucher, signature);

        vm.prank(alice);
        uint256 tokenId = passport.mint{value: price / 2}(voucher, signature);
        require(tokenId == 1 && passport.ownerOf(1) == alice, "discounted mint failed");
        require(!passport.missionQualified(alice), "a discount is not a mission");
        require(address(passport).balance == price / 2, "wrong amount collected");
    }

    function testTierGuards() public {
        // Both tiers at once is not a voucher the signer can mean.
        FruitFlyPassport.MintVoucher memory both =
            _tieredVoucher(alice, keccak256("both"), block.timestamp + 1 hours, true, true);
        bytes memory bothSignature = _sign(both);
        vm.expectRevert(FruitFlyPassport.InvalidVoucher.selector);
        vm.prank(alice);
        passport.mint(both, bothSignature);

        // A free voucher never accepts payment.
        FruitFlyPassport.MintVoucher memory free = _voucher(alice, keccak256("free"), block.timestamp + 1 hours);
        bytes memory freeSignature = _sign(free);
        vm.deal(alice, 1 ether);
        vm.expectRevert(FruitFlyPassport.WrongPayment.selector);
        vm.prank(alice);
        passport.mint{value: 1}(free, freeSignature);

        // With no public price there is no tier to halve, so the discount cannot open.
        FruitFlyPassport.MintVoucher memory half =
            _tieredVoucher(alice, keccak256("closed"), block.timestamp + 1 hours, true, false);
        bytes memory halfSignature = _sign(half);
        vm.expectRevert(FruitFlyPassport.PublicMintClosed.selector);
        vm.prank(alice);
        passport.mint(half, halfSignature);
    }

    function testPaidVoucherNeverChargesAnExistingHolder() public {
        uint256 price = 0.002 ether;
        passport.setPublicMint(true, price);
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        passport.publicMint{value: price}();

        FruitFlyPassport.MintVoucher memory paid =
            _tieredVoucher(alice, keccak256("again"), block.timestamp + 1 hours, false, false);
        bytes memory paidSignature = _sign(paid);
        vm.expectRevert(FruitFlyPassport.AlreadyMinted.selector);
        vm.prank(alice);
        passport.mint{value: price}(paid, paidSignature);
        require(address(passport).balance == price, "existing holder was charged twice");
    }

    function testOwnerMintAndBatch() public {
        vm.expectRevert(FruitFlyPassport.NotOwner.selector);
        vm.prank(alice);
        passport.ownerMint(bob);

        uint256 tokenId = passport.ownerMint(bob);
        require(tokenId == 1 && passport.ownerOf(1) == bob, "owner mint failed");
        require(passport.missionQualified(bob), "owner mint is the mission tier");
        require(address(passport).balance == 0, "owner mint is free");
        require(passport.totalSupply() == 1, "supply wrong");

        // soul-bound: a second owner mint to the same address reverts
        vm.expectRevert(FruitFlyPassport.AlreadyMinted.selector);
        passport.ownerMint(bob);

        // the batch skips holders and zero addresses instead of bricking
        address[] memory list = new address[](3);
        list[0] = bob;
        list[1] = address(0);
        list[2] = alice;
        uint256 minted = passport.ownerMintBatch(list);
        require(minted == 1, "batch must skip holder and zero address");
        require(passport.ownerOf(2) == alice && passport.totalSupply() == 2, "batch mint wrong");

        // and the supply cap still binds owner mints
        FruitFlyPassportHarness cap = new FruitFlyPassportHarness(address(this), signer, CAMPAIGN, "ipfs://passport/");
        cap.forceTotalSupply(cap.MAX_SUPPLY());
        vm.expectRevert(FruitFlyPassport.SoldOut.selector);
        cap.ownerMint(alice);
    }

    function _voucher(address recipient, bytes32 nonce, uint256 deadline)
        private pure returns (FruitFlyPassport.MintVoucher memory)
    {
        return FruitFlyPassport.MintVoucher(recipient, CAMPAIGN, nonce, deadline, false, true);
    }

    function _tieredVoucher(address recipient, bytes32 nonce, uint256 deadline, bool participant, bool free)
        private pure returns (FruitFlyPassport.MintVoucher memory)
    {
        return FruitFlyPassport.MintVoucher(recipient, CAMPAIGN, nonce, deadline, participant, free);
    }

    function _sign(FruitFlyPassport.MintVoucher memory voucher) private returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_KEY, passport.voucherDigest(voucher));
        return abi.encodePacked(r, s, v);
    }
}
