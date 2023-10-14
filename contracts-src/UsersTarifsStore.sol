// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./MultyOwner.sol";
import "./UsersFinanceStore.sol";

uint256 constant YEAR = 360 * 86400;

// If reject rollback to this
struct RollbackStruct {
    uint256 tarif; 
    uint256 date;
    uint256 endsAt;
    UsageRec usage;
}

struct UserTarifStruct {
    uint256 tarif;
    uint256 boughtAt;
    uint256 endsAt;
    bool gotInviteBonus;
}

struct UsageRec {
    uint16 freeSlots;
    uint16 freeLVSlots;
    uint16 level;
    uint16 filled;
}

// Manage users info here
contract UsersTarifsStore is TarifsStore {
    mapping(address => UserTarifStruct) public cTarifs;
    mapping(address => UserTarifStruct) public pTarifs;
    mapping(address => RollbackStruct) public rollbacks;
    mapping(address => bool) public registered;
    mapping(address => UsageRec) public usage;
    mapping(address => uint8) public ranks;

    bool public actionEnabled;
    function setActionEnabled(bool _actionEnabled) public onlyOwner {
        actionEnabled = _actionEnabled;
    }

    uint256 public clientTarifLength;
    function setClientTarifLength(uint256 _clientTarifLength) public onlyOwner {
        clientTarifLength = _clientTarifLength;
    }    

    UsersFinanceStore public usersFinance;

    constructor(address _usersFinanceAddress) {
        usersFinance = UsersFinanceStore(_usersFinanceAddress);
        setClientTarifLength(30 * 86400);
    }    

    // --- Admin section ---
    // function adminSetCTarif(address _acc, uint256 _cTarif) public onlyOwner {
    //     cTarifs[_acc] = UserTarifStruct(_cTarif, block.timestamp, block.timestamp + clientTarifLength, true);
    // }

    function adminSetCTarif(address _acc, UserTarifStruct memory _tarif) public onlyOwner {
        cTarifs[_acc] = _tarif;
    }

    function adminSetPTarif(address _acc, UserTarifStruct memory _tarif) public onlyOwner {
        registered[_acc] = true;
        pTarifs[_acc] = _tarif; //UserTarifStruct(_pTarif, block.timestamp, block.timestamp + YEAR, true);
        // usage[_acc] = UsageRec(
        //     level * TarifDataLib.getNumSlots(_pTarif),
        //     level * TarifDataLib.getNumLVSlots(_pTarif),
        //     level, 0);
    }

    function adminSetRegistered(address _acc) public onlyOwner {
        registered[_acc] = true;
    }

    function setUsage(address _acc, UsageRec memory _usage) public onlyOwner {
        usage[_acc] = _usage;
        // usage[_acc].freeSlots = _freeSlots;
        // usage[_acc].freeLVSlots = _freeLVSlots;
        // usage[_acc].filled = _filled;
    }

    function adminSetRank(address _acc, uint8 _rank) public onlyOwner {        
        ranks[_acc] = _rank;
    }

    // === Admin section ===

    // --- is/has section
    function hasActiveMaxClientTarif(address user) public view returns (bool) {
        return
            isClientTarifActive(user) &&
            clientTarifs.isLast(TarifDataLib.tarifKey(cTarifs[user].tarif));
    }

    function isPartnerActive(address _partner) public view returns (bool) {
        return
            hasActiveMaxClientTarif(_partner) && isPartnerTarifActive(_partner);
    }

    function isPartnerFullfilled(address _partner) public view returns (bool) {
        return usage[_partner].filled >= TarifDataLib.getFullNum(pTarifs[_partner].tarif);
    }

    // --- User space

    function isClientTarifActive(address _acc) public view returns (bool) {
        return cTarifs[_acc].tarif != 0 && block.timestamp < cTarifs[_acc].endsAt;
    }

    function isPartnerTarifActive(address _acc) public view returns (bool) {
        return pTarifs[_acc].tarif != 0 && block.timestamp - pTarifs[_acc].boughtAt <= YEAR;
    }

    function getNextBuyCount(address _acc, uint16 _tarifKey) public view returns(uint16) {
        if (isPartnerTarifActive(_acc)){            
            if (!isT1BetterOrSameT2(_tarifKey, TarifDataLib.tarifKey(pTarifs[_acc].tarif))) return 0;

            if (TarifDataLib.tarifKey(pTarifs[_acc].tarif) == _tarifKey)
                return 1;            
            else
                return usage[_acc].level;
        }
        return 1;
    }

    function getNextLevel(address _acc, uint16 _tarifKey) public view returns(uint16) {
        if (isPartnerTarifActive(_acc)){            
            if (!isT1BetterOrSameT2(_tarifKey, TarifDataLib.tarifKey(pTarifs[_acc].tarif))) return 0;

            if (TarifDataLib.tarifKey(pTarifs[_acc].tarif) == _tarifKey)
                return usage[_acc].level + 1;            
            else
                return usage[_acc].level;
        }
        return 1;
    }

    function newClientTarif(address _acc, uint256 _tarif) public onlyOwner {
        usersFinance.freezeMoney(TarifDataLib.getPrice(_tarif), _acc);

        cTarifs[_acc].tarif = _tarif;
        cTarifs[_acc].boughtAt = block.timestamp;
        cTarifs[_acc].endsAt = block.timestamp + clientTarifLength;

        usersFinance.addUserBuy(_acc, BuyHistoryRec({
            tarif: _tarif,
            timestamp: block.timestamp,
            count: 1,
            state: 0,
            payedCent: TarifDataLib.getPrice(_tarif) * 100
        }));
    }

    function newPartnerTarif(address _acc, uint256 _tarif) public onlyOwner {
        uint16 _tarifKey = TarifDataLib.tarifKey(_tarif);

        uint16 buyCount = getNextBuyCount(_acc, _tarifKey);
        uint16 level = getNextLevel(_acc, _tarifKey);

        require(buyCount > 0);

        uint32 payPrice = TarifDataLib.getPrice(_tarif);
        if (!isPartnerTarifActive(_acc)){
            level = 1;
        }
        else if (level == getLevel(_acc)){
            payPrice -= TarifDataLib.getPrice(pTarif(_acc));
        }
        usersFinance.freezeMoney(payPrice * buyCount, _acc);

        rollbacks[_acc].tarif = pTarifs[_acc].tarif;
        rollbacks[_acc].date = pTarifs[_acc].boughtAt;
        rollbacks[_acc].endsAt = pTarifs[_acc].endsAt;
        rollbacks[_acc].usage = usage[_acc];

        if (isPartnerTarifActive(_acc)){
            usage[_acc].freeSlots += TarifDataLib.getNumSlots(_tarif) * buyCount;
            usage[_acc].freeLVSlots += TarifDataLib.getNumLVSlots(_tarif) * buyCount;
        }
        else{
            usage[_acc].freeSlots = TarifDataLib.getNumSlots(_tarif);
            usage[_acc].freeLVSlots = TarifDataLib.getNumLVSlots(_tarif);
        }

        pTarifs[_acc].tarif = _tarif;
        pTarifs[_acc].boughtAt = block.timestamp;
        pTarifs[_acc].endsAt = block.timestamp + clientTarifLength;

        usersFinance.addUserBuy(_acc,
            BuyHistoryRec({
                tarif: _tarif,
                timestamp: block.timestamp,
                count: buyCount,
                state: 0,
                payedCent: payPrice * buyCount * 100
            })
        );

        usage[_acc].level = level;
        usage[_acc].filled = 0;
        usersFinance.setComsaExists(_acc, true);

        if (actionEnabled && partnerTarifs.isLast(TarifDataLib.tarifKey(_tarif))){
            adminSetRank(_acc, 3);
            cTarifs[_acc].endsAt += 60 * 86400;
        }        
    }

    function canReject(address _acc) public view returns (bool) {
        if (usersFinance.getBuyHistoryCount(_acc) == 0) return false;
        
        BuyHistoryRec memory buy = usersFinance.getLastBuy(_acc);

        return TarifDataLib.isPartner(buy.tarif) 
            && buy.state == 0
            && block.timestamp - buy.timestamp < 48 * 3600;
    }

    function reject() public {
        require(canReject(msg.sender));

        if (actionEnabled && partnerTarifs.isLast(TarifDataLib.tarifKey(pTarifs[msg.sender].tarif))){
            cTarifs[msg.sender].endsAt -= 60 * 86400;
        }

        pTarifs[msg.sender].tarif = rollbacks[msg.sender].tarif;
        pTarifs[msg.sender].boughtAt = rollbacks[msg.sender].date;
        pTarifs[msg.sender].endsAt = rollbacks[msg.sender].endsAt;
        usage[msg.sender] = rollbacks[msg.sender].usage;

        usersFinance.rejectBuy(msg.sender);
    }

    function useFill(address _acc) public onlyOwner {
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
        cTarifs[_acc].endsAt += 30 * 86400;
    }

    function cTarifExists(uint16 _tarifKey) public view returns (bool) {
        return clientTarifs.exists(_tarifKey);
    }

    function pTarifExists(uint16 _tarifKey) public view returns (bool) {
        return partnerTarifs.exists(_tarifKey);
    }

    function canBuyPTarif(address _acc) public view returns (bool) {
        return
            registered[_acc] &&
            hasActiveMaxClientTarif(_acc) &&
            isPartnerFullfilled(_acc);
    }
}
