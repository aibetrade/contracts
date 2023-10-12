// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/MultyOwner.sol";
import "../stores/AppStore.sol";

contract BaseApp {
    AppStore public appStore;

    function setAppStore(address _appStore) public onlyMember {
        appStore = AppStore(_appStore);
    }

    function isMember(address _acc) public returns (bool) {
        return appStore.members(_acc);
    }

    modifier onlyMember() {
        require(isMember(msg.sender), "Only the member can call this function.");
        _;
    }
}