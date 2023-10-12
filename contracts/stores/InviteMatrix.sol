// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../apps/BaseApp.sol";

contract InviteMatrix is BaseApp {
    mapping(uint32 => uint8) public matrix;

    function getInvitePercent(uint16 _pTarifKey, uint16 _cTarifKey) public view returns(uint8) {
        uint32 key = (uint32(_pTarifKey) << 16) | _cTarifKey;
        return matrix[key];
    }

    function setInviteMatrix(uint32[] memory keys, uint8[] memory percs) public onlyMember {
        require(keys.length == percs.length);
        for (uint8 i = 0; i < keys.length; i++){
            matrix[keys[i]] = percs[i];
        }
    }
}