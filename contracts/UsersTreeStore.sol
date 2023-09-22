// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MultyOwner.sol";

struct UserStructRec {
    address mentor;
    address[] referals;
}

contract UsersTreeStore is MultyOwner {
    mapping(address => UserStructRec) public users;
    mapping(address => bool) public blockedUsers;

    address[] public registeredUsers;
   
    function registeredUsersCount() public view returns (uint256) {
        return registeredUsers.length;
    }

    function getRegisteredUsers() public view returns (address[] memory) {
        return registeredUsers;
    }

    function getUserInfo(address _acc) public view returns (UserStructRec memory) {
        return users[_acc];
    }

    function adminSetUserBlocked(address _acc, bool _blocked) public onlyOwner{
        blockedUsers[_acc] = _blocked;
    }

    function getMentor(address _acc) public view returns (address) {
        return users[_acc].mentor;
    }

    function setMentor(address _mentor) public {
        require(_mentor != address(0) && msg.sender != _mentor);
        require(users[msg.sender].mentor == address(0));
        require(users[_mentor].mentor != address(0) || _mentor == address(1));

        registeredUsers.push(msg.sender);
        users[msg.sender].mentor = _mentor;
        users[_mentor].referals.push(msg.sender);
    }   

    function adminSetMentor(address _user, address _mentor) public onlyOwner {
        bool found = false;
        for (uint256 i = 0; i < registeredUsers.length; i++){
            if (registeredUsers[i] == _user){
                found = true;
                break;
            }
        }
        if (!found) registeredUsers.push(_user);

        users[_user].mentor = _mentor;

        found = false;
        for (uint256 i = 0; i < users[_mentor].referals.length; i++){
            if (users[_mentor].referals[i] == _user){
                found = true;
                break;
            }
        }
        if (!found) users[_mentor].referals.push(_user);
    }   


    function getReferals(address _acc) public view returns (address[] memory) {
        return users[_acc].referals;
    }
}