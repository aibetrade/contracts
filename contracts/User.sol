// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./OnlyOwner.sol";

uint256 constant MONTH = 30 * 86400;
uint256 constant YEAR = 360 * 86400;
uint16 constant REGISTRATION_KEY = 65535;

struct PayHistoryRec {
    address from;
    uint256 timestamp;
    uint16 cents;
}

struct BuyHistoryRec {
    address from; // Needs for rollback
    uint256 timestamp;
    uint256 tarif;
    uint16 count; // How many tarifs was bought
}

struct UserStruct {
    bool registered;
    address mentor;
    uint256 rollbackTarif; // If reject rollback to this tarif
    uint256 rollbackDate; // If reject rollback to this date
    uint64 rollbackUsage; // If reject rollback to this date
    uint256 clientTarif;
    uint256 clientTarifAt;
    uint256 partnerTarif;
    uint256 partnerTarifAt;
    uint64 partnerTarifUsage;
    BuyHistoryRec[] buyHistory;
    PayHistoryRec[] payHistory;
    address[] referals;
    uint256 lastBuyAt;
}

// Manage users info here
contract UsersStore is TarifsContract, OnlyOwner {
    mapping(address => UserStruct) public users;

    address[] public registeredUsers;

    function registeredUsersCount() public view returns (uint256) {
        return registeredUsers.length;
    }

    function setMentor(address mentor) public {
        require(mentor != address(0), "Mentor can not be 0");
        require(users[msg.sender].mentor == address(0), "Already have mentor");

        registeredUsers.push(msg.sender);
        users[msg.sender].mentor = mentor;
        users[mentor].referals.push(msg.sender);
    }

    // --- User space

    function getUser(address user) public view returns (UserStruct memory) {
        return users[user];
    }

    function getBuyHistory(
        address user
    ) public view returns (BuyHistoryRec[] memory) {
        return users[user].buyHistory;
    }

    function getPayHistory(
        address user
    ) public view returns (PayHistoryRec[] memory) {
        return users[user].payHistory;
    }

    function isClientTarifActive(address _client) public view returns (bool) {
        return block.timestamp - users[_client].clientTarifAt <= MONTH;
    }

    function isPartnerTarifActive(address _partner) public view returns (bool) {
        return block.timestamp - users[_partner].partnerTarifAt <= YEAR;
    }

    function newClientTarif(uint256 _tarif) internal {
        users[msg.sender].rollbackTarif = users[msg.sender].clientTarif;
        users[msg.sender].rollbackDate = users[msg.sender].clientTarifAt;

        users[msg.sender].clientTarif = _tarif;
        users[msg.sender].clientTarifAt = block.timestamp;

        users[msg.sender].buyHistory.push(
            BuyHistoryRec({
                from: msg.sender,
                tarif: _tarif,
                timestamp: block.timestamp,
                count: 1
            })
        );
    }

    function newPartnerTarif(uint256 _tarif, uint16 _count) internal {
        users[msg.sender].rollbackTarif = users[msg.sender].partnerTarif;
        users[msg.sender].rollbackDate = users[msg.sender].partnerTarifAt;
        users[msg.sender].rollbackUsage = users[msg.sender].partnerTarifUsage;

        if (tarifKey(_tarif) != REGISTRATION_KEY) {
            users[msg.sender].partnerTarif = _tarif;
            users[msg.sender].partnerTarifUsage = 0;
            users[msg.sender].partnerTarifAt = block.timestamp;
        }

        users[msg.sender].buyHistory.push(
            BuyHistoryRec({
                from: msg.sender,
                tarif: _tarif,
                timestamp: block.timestamp,
                count: _count
            })
        );
    }

    function rejectBuy(uint256 _buyIndex) internal {
        uint256 tar = users[msg.sender].buyHistory[_buyIndex].tarif;

        // Reject registration
        if (tarifKey(tar) == REGISTRATION_KEY) {
            users[msg.sender].registered = false;
        }
        // Reject parent tarif
        else if (isPartner(tar)) {
            users[msg.sender].partnerTarif = users[msg.sender].rollbackTarif;
            users[msg.sender].partnerTarifAt = users[msg.sender].rollbackDate;
            users[msg.sender].partnerTarifUsage = users[msg.sender].rollbackUsage;
        }
        // Reject client tarif
        else {
            users[msg.sender].clientTarif = users[msg.sender].rollbackTarif;
            users[msg.sender].clientTarifAt = users[msg.sender].rollbackDate;
        }

        users[msg.sender].buyHistory[_buyIndex].tarif = setRejected(users[msg.sender].buyHistory[_buyIndex].tarif);
        users[msg.sender].lastBuyAt = 0;
    }

    function getReferals(address user) public view returns (address[] memory) {
        return users[user].referals;
    }
}
