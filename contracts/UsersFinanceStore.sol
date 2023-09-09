// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MultyOwner.sol";
import "./Tarif.sol";
import "./ERC20Token.sol";

struct PayHistoryRec {
    address from;
    uint256 timestamp;
    uint32 cents;
}

struct BuyHistoryRec {
    address from; // Needs for rollbacgetk
    uint256 timestamp;
    uint256 tarif;
    uint16 count; // How many tarifs was bought
    bool rejected;
}

struct UserFinanceRec {
    BuyHistoryRec[] buyHistory;
    PayHistoryRec[] payHistory;
    uint8 _dummy;
}

contract UsersFinanceStore is MultyOwner {
    ERC20Token public erc20;

    mapping(address => UserFinanceRec) public users;
    mapping(address => bool) public comsaExists;
    mapping(address => uint256) public lastBuyTime;

    constructor(address _erc20) {
        erc20 = ERC20Token(_erc20);
    }

    function setComsaExists(address _acc, bool _exists) public onlyOwner {
        comsaExists[_acc] = _exists;
    }

    function setLastBuyTime(address _acc, uint256 _timestamp) public onlyOwner {
        lastBuyTime[_acc] = _timestamp;
    }

    function setComsaTaken(address _acc) public onlyOwner {
        comsaExists[_acc] = false;
    }

    function getLastBuy(address _acc) public view returns (BuyHistoryRec memory) {
        return users[_acc].buyHistory[users[_acc].buyHistory.length - 1];
    }

    function getBuyHistory(address user) public view returns (BuyHistoryRec[] memory) {
        return users[user].buyHistory;
    }

    function getBuyHistoryCount(address user) public view returns (uint256) {
        return users[user].buyHistory.length;
    }

    function getPayHistory(address user) public view returns (PayHistoryRec[] memory) {
        return users[user].payHistory;
    }

    function getPayTarif(address _acc, uint256 _buyIndex) public view returns (uint256) {
        return users[_acc].buyHistory[_buyIndex].tarif;
    }

    function getBuy(address _acc, uint256 _buyIndex) public view returns (BuyHistoryRec memory) {
        return users[_acc].buyHistory[_buyIndex];
    }

    function addUserPay(address _acc, PayHistoryRec memory rec) public onlyOwner {
        users[_acc].payHistory.push(rec);
    }

    function addUserBuy(address _acc, BuyHistoryRec memory rec) public onlyOwner {
        users[_acc].buyHistory.push(rec);
    }

    function rejectBuy(address _acc) public onlyOwner {        
        BuyHistoryRec storage buy = users[_acc].buyHistory[users[_acc].buyHistory.length - 1];
        buy.rejected = true;
        
        uint32 price = TarifDataLib.getPrice(buy.tarif);
        uint32 count = buy.count;
        erc20.transfer(_acc, centToErc20(count * price * 100));
    }

    function isRejected(address _acc, uint256 _buyIndex) public view returns (bool) {
        return TarifDataLib.isRejected(users[_acc].buyHistory[_buyIndex].tarif);
    }

    function centToErc20(uint256 _cents) public view returns (uint256){
        return _cents * (10 ** (erc20.decimals() - 2));
    }

    function freezeMoney(uint32 dollar, address _from) public {
        erc20.transferFrom(_from, address(this), centToErc20(dollar * 100));
    }

    function makePayment(address _from, address _to, uint32 _cent) public onlyOwner {
        erc20.transfer(_to, centToErc20(_cent));
        addUserPay(_to, PayHistoryRec({timestamp: block.timestamp, cents: _cent, from: _from}));
    }
}