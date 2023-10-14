// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// import "../apps/BaseApp.sol";
import "../MultyOwner.sol";

struct UserTarifStruct {
    uint256 tarif;
    uint256 boughtAt;
    uint256 endsAt;
    bool gotInviteBonus;
}

// Manage users info here
contract UserTarifHash is MultyOwner {
    mapping(address => UserTarifStruct) public tarifs;

    function setTarif(address _acc, UserTarifStruct memory _userTarifStruct) public onlyOwner {
        tarifs[_acc] = _userTarifStruct;
    }

    function setTarif(address _acc, uint256 _cTarif, uint256 _endsAt, bool _gotInviteBonus) public onlyOwner {
        tarifs[_acc] = UserTarifStruct(_cTarif, block.timestamp, _endsAt, _gotInviteBonus);
    }
}
