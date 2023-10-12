// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../apps/BaseApp.sol";

uint8 constant PAY_CODE_INVITE_CLI = 1;
uint8 constant PAY_CODE_INVITE_PAR = 2;
uint8 constant PAY_CODE_COMPANY = 3;
uint8 constant PAY_CODE_QUART_CLI = 4;
uint8 constant PAY_CODE_QUART_PAR = 5;
uint8 constant PAY_CODE_MAGIC = 6;
uint8 constant PAY_CODE_REGISTER = 7;

uint8 constant PAY_CODE_CLI_MATRIX = 8;
uint8 constant PAY_CODE_CLI_LV = 9;
uint8 constant PAY_CODE_PAR_RANK = 10;

struct PayHistoryRec {
    uint256 timestamp;
    address from;
    uint64 cents;
    uint8 payCode;
}

contract PayHistory is BaseApp {
    mapping(address => PayHistoryRec[]) History;

    function getHistoryCount(address user) public view returns (uint256) {
        return History[user].length;
    }

    function getHistory(address user) public view returns (PayHistoryRec[] memory) {
        return History[user];
    }

    function setHistory(address user, PayHistoryRec[] memory payHistory) public onlyMember {
        History[user] = payHistory;
    }

    function getHistoryRec(address user, uint256 index) public view returns (PayHistoryRec memory) {
        return History[user][index];
    }

    function setHistoryRec(address user, uint256 index, PayHistoryRec memory pay) public onlyMember {
        History[user][index] = pay;
    }

    function clear(address user) public onlyMember {
        History[user] = new PayHistoryRec[](0);
    }

    function append(address user, PayHistoryRec memory pay) public onlyMember {
        History[user].push(pay);
    }

    function getLastBuy(address acc) public view returns (PayHistoryRec memory) {
        if (History[acc].length == 0) return PayHistoryRec(0, 0, 0, 0);
        return History[acc][History[acc].length - 1];
    }
}