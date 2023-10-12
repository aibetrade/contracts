// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../apps/BaseApp.sol";

contract UsersTreeStore is BaseApp {
    mapping(address => address) public mentor;
    address[] public registeredUsers;
   
    function registeredUsersCount() public view returns (uint256) {
        return registeredUsers.length;
    }

    function getRegisteredUsers() public view returns (address[] memory) {
        return registeredUsers;
    }

    function setRegisteredUsers(address[] memory _items) public onlyMember{
        registeredUsers = _items;
    }

    function setMentor(address _mentor) public {
        require(_mentor != address(0) && msg.sender != _mentor);
        require(mentor[msg.sender] == address(0) || isMember(msg.sender));
        require(mentor[_mentor] != address(0) || _mentor == address(1));

        if (mentor[msg.sender] == address(0)) registeredUsers.push(msg.sender);
        mentor[msg.sender] = _mentor;
    }   
}