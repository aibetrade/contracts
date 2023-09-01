// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./OnlyOwner.sol";

uint256 constant MONTH = 30 * 86400;
uint256 constant YEAR = 360 * 86400;

struct PayHistoryRec {
    address from;
    uint256 timestamp;
    uint32 cents;
}

struct BuyHistoryRec {
    address from; // Needs for rollback
    uint256 timestamp;
    uint256 tarif;
    uint16 count; // How many tarifs was bought
}

struct RollbackStruct {
    uint256 tarif; // If reject rollback to this tarif
    uint256 date; // If reject rollback to this date
    uint64 usage; // If reject rollback to this date
}

struct UserTarifStruct {
    uint256 tarif;
    uint256 boughtAt;
    bool gotInviteBonus;
}

struct UserStruct {
    bool registered;
    address mentor;
    uint64 partnerTarifUsage;
    BuyHistoryRec[] buyHistory;
    PayHistoryRec[] payHistory;
    address[] referals;
    uint256 lastBuyAt;
}

// Manage users info here
contract UsersStore is TarifsContract, OnlyOwner {
    mapping(address => UserStruct) public users;
    mapping(address => UserTarifStruct) public cTarifs;
    mapping(address => UserTarifStruct) public pTarifs;
    mapping(address => RollbackStruct) public rollbacks;

    address[] public registeredUsers;

    function registeredUsersCount() public view returns (uint256) {
        return registeredUsers.length;
    }

    function setMentor(address mentor) public {
        require(mentor != address(0));
        require(users[msg.sender].mentor == address(0));

        registeredUsers.push(msg.sender);
        users[msg.sender].mentor = mentor;
        users[mentor].referals.push(msg.sender);
    }

    // --- User space

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
        return block.timestamp - cTarifs[_client].boughtAt <= MONTH;
    }

    function isPartnerTarifActive(address _partner) public view returns (bool) {
        return block.timestamp - pTarifs[_partner].boughtAt <= YEAR;
    }

    function newClientTarif(uint256 _tarif) internal {
        // uint256 tarif = clientTarifs.tarif(_key);
        rollbacks[msg.sender].tarif = cTarifs[msg.sender].tarif;
        rollbacks[msg.sender].date = cTarifs[msg.sender].boughtAt;

        cTarifs[msg.sender].tarif = _tarif;
        cTarifs[msg.sender].boughtAt = block.timestamp;

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
        rollbacks[msg.sender].tarif = pTarifs[msg.sender].tarif;
        rollbacks[msg.sender].date = pTarifs[msg.sender].boughtAt;
        rollbacks[msg.sender].usage = users[msg.sender].partnerTarifUsage;

        if (TarifReaderLib.tarifKey(_tarif) != REGISTRATION_KEY) {
            pTarifs[msg.sender].tarif = _tarif;
            pTarifs[msg.sender].boughtAt = block.timestamp;
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
        if (TarifReaderLib.tarifKey(tar) == REGISTRATION_KEY) {
            users[msg.sender].registered = false;
        }
        // Reject parent tarif
        else if (isPartner(tar)) {
            pTarifs[msg.sender].tarif = rollbacks[msg.sender].tarif;
            pTarifs[msg.sender].boughtAt = rollbacks[msg.sender].date;
            users[msg.sender].partnerTarifUsage = rollbacks[msg.sender].usage;
        }
        // Reject client tarif
        else {
            cTarifs[msg.sender].tarif = rollbacks[msg.sender].tarif;
            cTarifs[msg.sender].boughtAt = rollbacks[msg.sender].date;
        }

        users[msg.sender].buyHistory[_buyIndex].tarif = setRejected(users[msg.sender].buyHistory[_buyIndex].tarif);
        users[msg.sender].lastBuyAt = 0;
    }

    function getReferals(address user) public view returns (address[] memory) {
        return users[user].referals;
    }
}
