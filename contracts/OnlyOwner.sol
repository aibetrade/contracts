// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract OnlyOwner {
    address public owner;
    function setOwner(address _owner) virtual public onlyOwner{
        owner = _owner;
    }

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function.");
        _;
    }
}