// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/PariksaINFT.sol";
import "../contracts/PariksaBadge.sol";
import "../contracts/ParikshaAttestation.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        PariksaINFT inft = new PariksaINFT("Pariksha Legal Agent", "PLEGAL");
        PariksaBadge badge = new PariksaBadge("Pariksha Badge", "PBADGE");
        ParikshaAttestation attest = new ParikshaAttestation();

        console2.log("PariksaINFT:          ", address(inft));
        console2.log("PariksaBadge:         ", address(badge));
        console2.log("ParikshaAttestation:  ", address(attest));

        vm.stopBroadcast();
    }
}
