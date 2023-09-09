// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MultyOwner {
    mapping(address => bool) public allowed;

    function appendOwner(address _owner) virtual public onlyOwner{
        allowed[_owner] = true;
    }

    function removeOwner(address _owner) virtual public onlyOwner{
        allowed[_owner] = false;
    }

    constructor() {
        allowed[msg.sender] = true;
    }

    modifier onlyOwner() {
        require(allowed[msg.sender], "Only the owner can call this function.");
        _;
    }
}