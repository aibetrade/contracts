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

    // function getUser(address acc) public view returns (UserStruct memory){
    //     return users[acc];
    // }

    function getLastPay(address acc) public view returns (BuyHistoryRec memory) {
        return users[acc].buyHistory[users[acc].buyHistory.length - 1];
    }

    function addUserPay(
        address acc,
        PayHistoryRec memory rec
    ) public onlyOwner {
        users[acc].payHistory.push(rec);
    }

    // --- is/has section
    function hasActiveMaxClientTarif(address user) public view returns (bool) {
        return
            isClientTarifActive(user) &&
            clientTarifs.isLast(cTarifs[user].tarif);
    }

    function isPartnerActive(address _partner) public view returns (bool) {
        return
            hasActiveMaxClientTarif(_partner) && isPartnerTarifActive(_partner);
    }

    function isPartnerFullfilled(address _partner) public view returns (bool) {
        return
            TarifUsageLib.getFilled(users[_partner].partnerTarifUsage) >=
            TarifDataLib.getFullNum(pTarifs[_partner].tarif);
    }

    function registeredUsersCount() public view returns (uint256) {
        return registeredUsers.length;
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

    function newClientTarif(address _acc, uint256 _tarif) public onlyOwner {
        // uint256 tarif = clientTarifs.tarif(_key);
        rollbacks[_acc].tarif = cTarifs[_acc].tarif;
        rollbacks[_acc].date = cTarifs[_acc].boughtAt;

        cTarifs[_acc].tarif = _tarif;
        cTarifs[_acc].boughtAt = block.timestamp;

        users[_acc].buyHistory.push(
            BuyHistoryRec({
                from: _acc,
                tarif: _tarif,
                timestamp: block.timestamp,
                count: 1
            })
        );
    }

    function newPartnerTarif(
        address _acc,
        uint256 _tarif,
        uint16 _count
    ) public onlyOwner {
        rollbacks[_acc].tarif = pTarifs[_acc].tarif;
        rollbacks[_acc].date = pTarifs[_acc].boughtAt;
        rollbacks[_acc].usage = users[_acc].partnerTarifUsage;

        if (TarifDataLib.tarifKey(_tarif) != REGISTRATION_KEY) {
            pTarifs[_acc].tarif = _tarif;
            pTarifs[_acc].boughtAt = block.timestamp;
        }

        users[_acc].buyHistory.push(
            BuyHistoryRec({
                from: _acc,
                tarif: _tarif,
                timestamp: block.timestamp,
                count: _count
            })
        );
    }

    function canReject(address _acc) public view returns (bool) {
        return block.timestamp - users[_acc].lastBuyAt < 48 * 3600;
    }

    function rejectBuy(address acc) public onlyOwner {
        uint256 tar = getLastPay(acc).tarif;

        // Reject registration
        if (TarifDataLib.tarifKey(tar) == REGISTRATION_KEY) {
            users[acc].registered = false;
        }
        // Reject parent tarif
        else if (TarifDataLib.isPartner(tar)) {
            pTarifs[acc].tarif = rollbacks[acc].tarif;
            pTarifs[acc].boughtAt = rollbacks[acc].date;
            users[acc].partnerTarifUsage = rollbacks[acc].usage;
        }
        // Reject client tarif
        else {
            cTarifs[acc].tarif = rollbacks[acc].tarif;
            cTarifs[acc].boughtAt = rollbacks[acc].date;
        }

        // users[acc].buyHistory[_buyIndex].tarif = TarifDataLib.setRejected(users[acc].buyHistory[_buyIndex].tarif);
        uint256 _buyIndex = users[acc].buyHistory.length - 1;
        users[acc].buyHistory[_buyIndex].tarif = TarifDataLib.setRejected(users[acc].buyHistory[_buyIndex].tarif);
        users[acc].lastBuyAt = 0;
    }

    function getPayTarif(
        address _acc,
        uint256 _buyIndex
    ) public view returns (uint256) {
        return users[_acc].buyHistory[_buyIndex].tarif;
    }

    function isPayFixed(
        address _acc,
        uint256 _buyIndex
    ) public view returns (bool) {
        return
            !TarifDataLib.getIsRejected(
                users[_acc].buyHistory[_buyIndex].tarif
            ) &&
            !TarifDataLib.getIsComsaTaken(
                users[_acc].buyHistory[_buyIndex].tarif
            ) &&
            block.timestamp - users[_acc].buyHistory[_buyIndex].timestamp >
            48 * 3600;
    }

    function getReferals(address user) public view returns (address[] memory) {
        return users[user].referals;
    }

    function setComsaTaken(address _acc, uint256 _buyIndex) public onlyOwner {
        users[_acc].buyHistory[_buyIndex].tarif = TarifDataLib.setComsaTaken(
            users[_acc].buyHistory[_buyIndex].tarif
        );
    }

    function canFreezeMoney(address _acc) public view returns (bool) {
        return block.timestamp - users[_acc].lastBuyAt > 48 * 3600;
    }

    function setLastBuyTime(address _acc, uint256 _timestamp) public {
        users[_acc].lastBuyAt = _timestamp;
    }

    function getMentor(address _acc) public view returns (address) {
        return users[_acc].mentor;
    }

    function setMentor(address _mentor) public {
        require(_mentor != address(0) && msg.sender != _mentor);
        require(users[msg.sender].mentor == address(0));

        registeredUsers.push(msg.sender);
        users[msg.sender].mentor = _mentor;
        users[_mentor].referals.push(msg.sender);
    }

    function getUsage(address _acc) public view returns (uint64) {
        return users[_acc].partnerTarifUsage;
    }

    function setUsage(address _acc, uint64 _usage) public onlyOwner {
        users[_acc].partnerTarifUsage = _usage;
    }

    function hasCInviteBonus(address _acc) public view returns (bool) {
        return cTarifs[_acc].gotInviteBonus;
    }

    function giveCInviteBonus(address _acc) public onlyOwner {
        cTarifs[_acc].gotInviteBonus = true;
    }

    function hasPInviteBonus(address _acc) public view returns (bool) {
        return pTarifs[_acc].gotInviteBonus;
    }

    function givePInviteBonus(address _acc) public onlyOwner {
        pTarifs[_acc].gotInviteBonus = true;
    }

    function cTarif(address _acc) public view returns (uint256) {
        return cTarifs[_acc].tarif;
    }

    function pTarif(address _acc) public view returns (uint256) {
        return pTarifs[_acc].tarif;
    }

    function hasCompress(address _acc) public view returns (bool) {
        return TarifDataLib.hasCompress(pTarifs[_acc].tarif);
    }

    function hasSlot(address _acc) public view returns (bool) {
        return
            TarifUsageLib.hasSlot(
                pTarifs[_acc].tarif,
                users[_acc].partnerTarifUsage
            );
    }

    function useSlot(address _acc) public onlyOwner {
        users[_acc].partnerTarifUsage = TarifUsageLib.useSlot(
            users[_acc].partnerTarifUsage
        );
    }

    function hasLVSlot(address _acc) public view returns (bool) {
        return
            TarifUsageLib.hasLVSlot(
                pTarifs[_acc].tarif,
                users[_acc].partnerTarifUsage
            );
    }

    function useLVSlot(address _acc) public onlyOwner {
        users[_acc].partnerTarifUsage = TarifUsageLib.useLVSlot(
            users[_acc].partnerTarifUsage
        );
    }

    function canRegister(address _acc) public view returns (bool) {
        return hasActiveMaxClientTarif(_acc) && !users[_acc].registered;
    }

    function register(address _acc) public onlyOwner {
        users[_acc].registered = true;
    }

    function cTarifExists(uint256 _tarif) public view returns (bool) {
        return clientTarifs.exists(_tarif);
    }

    function pTarifExists(uint256 _tarif) public view returns (bool) {
        return partnerTarifs.exists(_tarif);
    }

    function canBuyPTarif(address _acc) public view returns (bool) {
        return
            users[_acc].registered &&
            hasActiveMaxClientTarif(_acc) &&
            isPartnerFullfilled(_acc);
    }
}
