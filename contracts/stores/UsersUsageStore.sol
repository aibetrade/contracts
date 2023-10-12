// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../apps/BaseApp.sol";

struct UsageRec {
    uint16 freeSlots;
    uint16 freeLVSlots;
    uint16 level;
    uint16 filled;
}

// Manage users info here
contract UsersUsageStore is BaseApp {
    mapping(address => UsageRec) public usage;

    function setUsage(address _acc, uint16 _freeSlots, uint16 _freeLVSlots, uint16 _filled) public onlyMember {
        usage[_acc].freeSlots = _freeSlots;
        usage[_acc].freeLVSlots = _freeLVSlots;
        usage[_acc].filled = _filled;
    }
}
