// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../apps/BaseApp.sol";

// Manage users info here
contract UsersRankStore is BaseApp {
    mapping(address => uint8) public ranks;

    function setRank(address _acc, uint8 _rank) public onlyMember {        
        ranks[_acc] = _rank;
    }
}
