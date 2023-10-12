// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../apps/BaseApp.sol";

uint8 constant BUY_STATE_NEW = 0;
uint8 constant BUY_STATE_REJECTED = 1;
uint8 constant BUY_STATE_ACCEPTED = 2;

struct BuyHistoryRec {
    uint256 timestamp;
    uint256 tarif;
    uint16 count; // How many tarifs was bought
    uint8 state;
    uint32 payed;
}

contract BuyHistory is BaseApp {
    mapping(address => BuyHistoryRec[]) History;

    function getHistoryCount(address user) public view returns (uint256) {
        return History[user].length;
    }

    function getHistory(address user) public view returns (BuyHistoryRec[] memory) {
        return History[user];
    }

    function getHistoryRec(address user, uint256 index) public view returns (BuyHistoryRec memory) {
        return History[user][index];
    }

    function setHistory(address user, BuyHistoryRec[] memory buyHistory) public onlyMember {
        History[user] = buyHistory;
    }

    function clear(address user) public onlyMember {
        History[user] = new BuyHistoryRec[](0);
    }

    function setHistoryRec(address user, uint256 index, BuyHistoryRec memory buy) public onlyMember {
        History[user][index] = buy;
    }

    function append(address user, BuyHistoryRec memory buy) public onlyMember {
        History[user].push(buy);
    }

    function getLastRec(address acc) public view returns (BuyHistoryRec memory) {
        if (History[acc].length == 0) return BuyHistoryRec(0, 0, 0, 0, 0);
        return History[acc][History[acc].length - 1];
    }
}