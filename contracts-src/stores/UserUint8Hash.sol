// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// import "../apps/BaseApp.sol";
import "../MultyOwner.sol";

// Manage users info here
contract UserUint8Hash is MultyOwner {
    mapping(address => uint8) public items;

    function setItem(address _acc, uint8 _item) public onlyOwner {
        items[_acc] = _item;
    }

    function setItems(address[] memory _accs, uint8[] memory _items) public onlyOwner {
        for(uint16 i = 0; i < _accs.length; i++)
            items[_accs[i]] = _items[i];
    }
}
