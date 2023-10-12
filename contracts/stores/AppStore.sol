// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/MultyOwner.sol";

contract AppStore is MultyOwner {
    mapping(uint64 => address) public apps;
    mapping(uint64 => bool) public known;
    mapping(address => bool) public members;
    uint64[] public codes;

    function setApp(uint64 _code, address _app) public onlyOwner {
        apps[_code] = _app;

        if (!known[_code]){
            known[_code] = true;
            codes.push(_code);
        }

        // Refresh members list
        bool found = false;
        for(uint64 i = 0; i < codes.length; i++){
            if (apps[codes[i]] == _app){
                found = true;
                break;
            }
        }
        members[apps[_code]] = found;
    }
}