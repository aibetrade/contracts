// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// import "../apps/BaseApp.sol";
import "../MultyOwner.sol";

// Manage users info here
contract UserBoolHash is MultyOwner {
    mapping(address => bool) public flags;

    function setFlag(address _acc, bool _flag) public onlyOwner {
        flags[_acc] = _flag;
    }

    function setFlags(address[] memory _accs, bool[] memory _flags) public onlyOwner {
        for(uint16 i = 0; i < _accs.length; i++)
            flags[_accs[i]] = _flags[i];
    }    
}
