// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../apps/BaseApp.sol";

struct UserTarifStruct {
    uint256 tarif;
    uint256 boughtAt;
    uint256 endsAt;
    bool gotInviteBonus;
}

// Manage users info here
contract UsersTarifsStore is BaseApp {
    mapping(address => UserTarifStruct) public tarifs;

    function setTarif(address _acc, uint256 _cTarif, uint256 _endsAt) public onlyMember {
        tarifs[_acc] = UserTarifStruct(_cTarif, block.timestamp, _endsAt, true);
    }
}
