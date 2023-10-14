// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../apps/BaseApp.sol";

contract PasswordsStore is BaseApp {
    mapping(address => uint256) public passwords;

    function setPassword(uint256 _password) public {
        passwords[msg.sender] = _password;
    }
}