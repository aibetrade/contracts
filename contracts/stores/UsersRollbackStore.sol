// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../apps/BaseApp.sol";
import "./UsersUsageStore.sol";

// If reject rollback to this
struct RollbackStruct {
    uint256 tarif; 
    uint256 date;
    uint256 endsAt;
    UsageRec usage;
}

// Manage users info here
contract UsersTarifsStore is BaseApp {
    mapping(address => RollbackStruct) public items;

    function setRollback(address _acc, RollbackStruct memory _rollback) public onlyMember {
        items[_acc] = _rollback;
    }
}
