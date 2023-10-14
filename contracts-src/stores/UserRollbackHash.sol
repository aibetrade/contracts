// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// import "../apps/BaseApp.sol";
import "../MultyOwner.sol";

struct UsageRec {
    uint16 freeSlots;
    uint16 freeLVSlots;
    uint16 level;
    uint16 filled;
}

struct RollbackStruct {
    uint256 tarif; 
    uint256 date;
    uint256 endsAt;
    UsageRec usage;
}

contract UserRollbackHash is MultyOwner {
    mapping(address => RollbackStruct) public items;

    function setItem(address _acc, RollbackStruct memory _item) public onlyOwner {
        items[_acc] = _item;
    }

    function getItem(address _acc) public view returns (RollbackStruct memory){
        return items[_acc];
    }

    function setItems(address[] memory _accs, RollbackStruct[] memory _items) public onlyOwner {
        for(uint16 i = 0; i < _accs.length; i++)
            items[_accs[i]] = _items[i];
    }
}
