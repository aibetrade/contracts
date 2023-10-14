// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BaseApp {
    AppStore public appStore;

    function setAppStore(address _appStore) public onlyMember {
        appStore = AppStore(_appStore);
    }

    function isMember(address _acc) public view returns (bool) {
        return address(appStore) == address(0) || appStore.members(_acc);
    }

    modifier onlyMember() {
        require(isMember(msg.sender), "Only the member can call this function.");
        _;
    }
}

contract AppStore is BaseApp {
    mapping(uint64 => address) public apps;
    mapping(address => bool) public members;

    uint64[] public codes;

    function getCodes() public view returns (uint64[] memory) {
        return codes;
    }    

    function setItem(uint64 _code, address _appAddress) public onlyMember {
        apps[_code] = _appAddress;

        bool found = false;
        for(uint32 i = 0 ; i < codes.length; i++){
            if (codes[i] == _code){
                found = true;
                break;
            }
        }
        if (!found) codes.push(_code);

        found = false;
        for(uint32 i = 0 ; i < codes.length; i++){
            if (apps[codes[i]] == _appAddress){
                found =  true;
                break;
            }
        }
        members[_appAddress] = found;
    }
}