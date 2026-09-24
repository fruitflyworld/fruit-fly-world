// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/FlyToken.sol";

interface Vm {
    function expectRevert(bytes4 selector) external;
    function prank(address sender) external;
}

contract FlyTokenTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    FlyToken private token;
    address private holder;
    address private alice;

    function setUp() public {
        holder = address(0xF01D);
        alice = address(0xA11CE);
        token = new FlyToken(holder);
    }

    function testFixedSupplyMintedOnce() public {
        require(token.totalSupply() == token.MAX_SUPPLY(), "supply");
        require(token.balanceOf(holder) == token.MAX_SUPPLY(), "holder balance");
        require(token.balanceOf(alice) == 0, "alice balance");
    }

    function testTransferUpdatesBalances() public {
        vm.prank(holder);
        token.transfer(alice, 100);
        require(token.balanceOf(holder) == token.MAX_SUPPLY() - 100, "holder");
        require(token.balanceOf(alice) == 100, "alice");
    }

    function testTransferRejectsOverdraft() public {
        vm.expectRevert(FlyToken.InsufficientBalance.selector);
        vm.prank(alice);
        token.transfer(holder, 1);
    }

    function testApproveAndTransferFrom() public {
        vm.prank(holder);
        token.approve(alice, 50);
        vm.prank(alice);
        token.transferFrom(holder, alice, 50);
        require(token.balanceOf(alice) == 50, "alice");
        require(token.allowance(holder, alice) == 0, "allowance consumed");
    }

    function testTransferFromRejectsOverAllowance() public {
        vm.prank(holder);
        token.approve(alice, 10);
        vm.expectRevert(FlyToken.InsufficientAllowance.selector);
        vm.prank(alice);
        token.transferFrom(holder, alice, 11);
    }

    function testBurnReducesSupply() public {
        vm.prank(holder);
        token.transfer(alice, 100);
        vm.prank(alice);
        token.burn(40);
        require(token.balanceOf(alice) == 60, "balance");
        require(token.totalSupply() == token.MAX_SUPPLY() - 40, "supply");
    }

    function testBurnFromConsumesAllowance() public {
        vm.prank(holder);
        token.approve(alice, 100);
        vm.prank(alice);
        token.burnFrom(holder, 30);
        require(token.totalSupply() == token.MAX_SUPPLY() - 30, "supply");
        require(token.allowance(holder, alice) == 70, "allowance");
    }

    function testMetadata() public {
        require(keccak256(bytes(token.name())) == keccak256("Fruit Fly World"), "name");
        require(keccak256(bytes(token.symbol())) == keccak256("FLY"), "symbol");
        require(token.decimals() == 18, "decimals");
    }
}
