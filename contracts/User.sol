// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";

struct PayHistoryRec {
    uint256 timestamp;
    uint16 amount;
    address from;
}

struct BuyHistoryRec {
    uint256 timestamp;
    uint256 tarif;
    uint16 amount;
}

struct UserStruct {
    bool registered;
    address mentor;
    uint128 clientTarif;
    uint256 clientTarifAt;
    uint128 partnerTarif;
    uint256 partnerTarifAt;
    uint64 partnerTarifUsage;
    BuyHistoryRec[] buyHistory;
    PayHistoryRec[] payHistory;
}

// Manage users info here
contract Userable {
    mapping(address => UserStruct) public users;

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

    function newClientTarif(uint128 _tarif) internal {
        users[msg.sender].clientTarif = _tarif;
        users[msg.sender].clientTarifAt = block.timestamp;
    }

    function newPartnerTarif(uint128 _tarif) internal {
        users[msg.sender].partnerTarif = _tarif;
        users[msg.sender].partnerTarifUsage = 0;
        users[msg.sender].partnerTarifAt = block.timestamp;
    }
}
