// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/FruitFlyPassport.sol";

interface Vm {
    function envAddress(string calldata name) external returns (address);
    function envString(string calldata name) external returns (string memory);
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract DeployFruitFlyPassport {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (FruitFlyPassport passport) {
        address owner = vm.envAddress("PASSPORT_OWNER");
        address signer = vm.envAddress("MINT_SIGNER_ADDRESS");
        string memory baseURI = vm.envString("PASSPORT_BASE_URI");

        vm.startBroadcast();
        passport = new FruitFlyPassport(owner, signer, keccak256("genesis"), baseURI);
        vm.stopBroadcast();
    }
}
