// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./MultyOwner.sol";
import "./UsersFinanceStore.sol";

uint256 constant MONTH = 30 * 86400;
uint256 constant YEAR = 360 * 86400;

// If reject rollback to this
struct RollbackStruct {
    uint256 tarif; 
    uint256 date;
    UsageRec usage;
}

struct UserTarifStruct {
    uint256 tarif;
    uint256 boughtAt;
    bool gotInviteBonus;
}

struct UsageRec {
    uint16 freeSlots;
    uint16 freeLVSlots;
    uint16 level;
    uint16 filled;
}

// Manage users info here
contract UsersTarifsStore is TarifsStore, MultyOwner {
    // mapping(address => UserStruct) public users;
    mapping(address => UserTarifStruct) public cTarifs;
    mapping(address => UserTarifStruct) public pTarifs;
    mapping(address => RollbackStruct) public rollbacks;
    mapping(address => bool) public registered;
    mapping(address => UsageRec) public usage;
    mapping(address => uint256) public lastBuyAt;

    UsersFinanceStore public usersFinance;

    constructor(address _usersFinanceAddress) {
        usersFinance = UsersFinanceStore(_usersFinanceAddress);
    }    

    // --- Admin section ---
    function adminSetCTarif(address _acc, uint256 _cTarif) public onlyOwner {
        cTarifs[_acc] = UserTarifStruct(_cTarif, block.timestamp, true);
        lastBuyAt[_acc] = 0;
    }

    function adminSetPTarif(address _acc, uint256 _pTarif, uint8 level) public onlyOwner {
        pTarifs[_acc] = UserTarifStruct(_pTarif, block.timestamp, true);
        usage[_acc] = UsageRec(
            level * TarifDataLib.getNumSlots(_pTarif),
            level * TarifDataLib.getNumLVSlots(_pTarif),
            level, 0);
        lastBuyAt[_acc] = 0;
    }

    function adminSetRegistered(address _acc) public onlyOwner {
        registered[_acc] = true;
        lastBuyAt[_acc] = 0;
    }

    function adminFillSlots(address _acc) public onlyOwner {
        usage[_acc].freeSlots = 0;
    }

    function adminFillLVSlots(address _acc) public onlyOwner {
        usage[_acc].freeLVSlots = 0;
    }

    function adminSetFilled(address _acc) public onlyOwner {        
        usage[_acc].filled = TarifDataLib.getFullNum(pTarifs[_acc].tarif);
    }


    // === Admin section ===

    // function getLastPay(address acc) public view returns (BuyHistoryRec memory) {
    //     return users[acc].buyHistory[users[acc].buyHistory.length - 1];
    // }

    // function addUserPay(address acc, PayHistoryRec memory rec) public onlyOwner {
    //     users[acc].payHistory.push(rec);
    // }

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
        return usage[_partner].filled >= TarifDataLib.getFullNum(pTarifs[_partner].tarif);
    }

    // --- User space

    // function getBuyHistory(
    //     address user
    // ) public view returns (BuyHistoryRec[] memory) {
    //     return users[user].buyHistory;
    // }

    // function getPayHistory(
    //     address user
    // ) public view returns (PayHistoryRec[] memory) {
    //     return users[user].payHistory;
    // }

    function isClientTarifActive(address _client) public view returns (bool) {
        return block.timestamp - cTarifs[_client].boughtAt <= MONTH;
    }

    function isPartnerTarifActive(address _partner) public view returns (bool) {
        return block.timestamp - pTarifs[_partner].boughtAt <= YEAR;
    }

    function newClientTarif(address _acc, uint256 _tarif) public onlyOwner {
        cTarifs[_acc].tarif = _tarif;
        cTarifs[_acc].boughtAt = block.timestamp;

        usersFinance.addUserBuy(_acc, BuyHistoryRec({
            from: _acc,
            tarif: _tarif,
            timestamp: block.timestamp,
            count: 1,
            rejected: false
        }));
    }

    function getNextBuyCount(address _acc, uint256 _tarif) public view returns(uint16) {
        if (isPartnerTarifActive(_acc)){            
            if (!isT1BetterOrSameT2(_tarif, pTarifs[_acc].tarif)) return 0;

            if (TarifDataLib.tarifKey(pTarifs[_acc].tarif) == TarifDataLib.tarifKey(_tarif))
                return 1;            
            else
                return usage[_acc].level;
        }
        return 1;
    }

    function getNextLevel(address _acc, uint256 _tarif) public view returns(uint16) {
        if (isPartnerTarifActive(_acc)){            
            if (!isT1BetterOrSameT2(_tarif, pTarifs[_acc].tarif)) return 0;

            if (TarifDataLib.tarifKey(pTarifs[_acc].tarif) == TarifDataLib.tarifKey(_tarif))
                return usage[_acc].level + 1;            
            else
                return usage[_acc].level;
        }
        return 1;
    }


    function newPartnerTarif(address _acc, uint256 _tarif, uint16 _count, uint16 _level) public onlyOwner {
        rollbacks[_acc].tarif = pTarifs[_acc].tarif;
        rollbacks[_acc].date = pTarifs[_acc].boughtAt;
        rollbacks[_acc].usage = usage[_acc];
        // rollbacks[_acc].usage = UsageRec(usage[_acc].freeSlots, usage[_acc].freeLVSlots, usage[_acc].level, usage[_acc].filled);

        if (_tarif != REGISTRATION_KEY){
            pTarifs[_acc].tarif = _tarif;
            pTarifs[_acc].boughtAt = block.timestamp;
            usage[_acc].freeSlots += TarifDataLib.getNumSlots(_tarif) * _count;
            usage[_acc].freeLVSlots += TarifDataLib.getNumLVSlots(_tarif) * _count;
        }

        usersFinance.addUserBuy(_acc,
            BuyHistoryRec({
                from: _acc,
                tarif: _tarif,
                timestamp: block.timestamp,
                count: _count,
                rejected: false
            })
        );

        usage[_acc].level = _level;
        usage[_acc].filled = 0;
        usersFinance.setComsaExists(_acc, true);
    }

    function canReject(address _acc) public view returns (bool) {
        if (usersFinance.getBuyHistoryCount(_acc) == 0) return false;
        
        BuyHistoryRec memory buy = usersFinance.getLastBuy(_acc);

        return TarifDataLib.isPartner(buy.tarif) 
            && buy.rejected == false
            && block.timestamp - buy.timestamp < 48 * 3600;
    }

    function reject() public {
        require(canReject(msg.sender));

        pTarifs[msg.sender].tarif = rollbacks[msg.sender].tarif;
        pTarifs[msg.sender].boughtAt = rollbacks[msg.sender].date;
        usage[msg.sender] = rollbacks[msg.sender].usage;

        usersFinance.rejectBuy(msg.sender);
    }

    // usersFinance Proxy
    // function makePayment(address _from, address _to, uint32 _cent) public onlyOwner {
    //     usersFinance.makePayment(_from, _to, _cent);
    // }

    function getLastBuyTime(address _acc) public view returns(uint256) {
        return lastBuyAt[_acc];
    }

    function setLastBuyTime(address _acc, uint256 _timestamp) public {
        lastBuyAt[_acc] = _timestamp;
    }

    function getUsage(address _acc) public view returns (UsageRec memory) {
        return usage[_acc];
    }

    function useFill(address _acc) public {
        usage[_acc].filled++;
    }

    function getLevel(address _acc) public view returns(uint16) {
        return usage[_acc].level;
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
        return usage[_acc].freeSlots > 0;
    }

    function useSlot(address _acc) public onlyOwner {
        require(usage[_acc].freeSlots > 0);
        usage[_acc].freeSlots--;
    }

    function hasLVSlot(address _acc) public view returns (bool) {
        return usage[_acc].freeLVSlots > 0;
    }

    function useLVSlot(address _acc) public onlyOwner {
        require(usage[_acc].freeLVSlots > 0);
        usage[_acc].freeLVSlots--;
    }

    function canRegister(address _acc) public view returns (bool) {
        return hasActiveMaxClientTarif(_acc) && !registered[_acc];
    }

    function register(address _acc) public onlyOwner {
        registered[_acc] = true;
        usage[_acc].level = 1;
    }

    function cTarifExists(uint256 _tarif) public view returns (bool) {
        return clientTarifs.exists(_tarif);
    }

    function pTarifExists(uint256 _tarif) public view returns (bool) {
        return partnerTarifs.exists(_tarif);
    }

    function canBuyPTarif(address _acc) public view returns (bool) {
        return
            registered[_acc] &&
            hasActiveMaxClientTarif(_acc) &&
            isPartnerFullfilled(_acc);
    }
}
