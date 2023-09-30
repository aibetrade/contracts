// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MultyOwner {
    mapping(address => bool) public owners;

    event OwnerAdded(address);
    event OwnerRemoved(address);

    function appendOwner(address _owner) virtual public onlyOwner{
        owners[_owner] = true;
        emit OwnerAdded(_owner);
    }

    function removeOwner(address _owner) virtual public onlyOwner{
        owners[_owner] = false;
        emit OwnerRemoved(_owner);
    }

    constructor() {
        owners[msg.sender] = true;
        emit OwnerAdded(msg.sender);
    }

    modifier onlyOwner() {
        require(owners[msg.sender], "Only the owner can call this function.");
        _;
    }
}