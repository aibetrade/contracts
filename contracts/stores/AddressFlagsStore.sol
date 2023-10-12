// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../apps/BaseApp.sol";

contract AddressFlagsStore is BaseApp {
    mapping(address => bool) public flags;

    function setFlag(address _acc, bool _flag) public onlyMember{
        flags[_acc] = _flag;
    }
}