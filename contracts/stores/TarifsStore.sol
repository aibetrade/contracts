// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../apps/BaseApp.sol";
import "../utils/TarifDataLib.sol";

contract TarifsStore is BaseApp {
    uint256[] public tarifs;

    function getAll() public view returns (uint256[] memory) {
        return tarifs;
    }

    function setAll(uint256[] calldata _tarifs) public onlyMember {
        tarifs = new uint256[](0);
        for (uint8 i = 0; i < _tarifs.length; i++) {
            tarifs.push(_tarifs[i]);
        }
    }

    // // Static tarif data (not changable)
    function tarifsCount() public view returns (uint256) {
        return tarifs.length;
    }

    function exists(uint16 _tarifKey) public view returns (bool) {
        for (uint8 i = 0; i < tarifs.length; i++) {
            if (TarifDataLib.tarifKey(tarifs[i]) == _tarifKey) return true;
        }
        return false;
    }

    // // Static tarif data (not changable)
    function tarif(uint16 _tarifKey) public view returns (uint256) {
        for (uint8 i = 0; i < tarifs.length; i++) {
            if (TarifDataLib.tarifKey(tarifs[i]) == _tarifKey) return tarifs[i];
        }
        return 0;
    }

    function isLast(uint16 _tarifKey) public view returns (bool) {
        if (tarifs.length == 0) return false;
        return _tarifKey == TarifDataLib.tarifKey(tarifs[tarifs.length - 1]);
    }

    function isT1BetterOrSameT2(uint16 _tarifKey1, uint16 _tarifKey2) public view returns (bool) {
        bool t2Found = false;

        if (_tarifKey2 == 0) return true; // Any model better then none.
        // if (k1 == k2) return true;

        for (uint8 i = 0; i < tarifs.length; i++) {
            if (TarifDataLib.tarifKey(tarifs[i]) == _tarifKey2)
                t2Found = true;
            if (TarifDataLib.tarifKey(tarifs[i]) == _tarifKey1)
                return t2Found;
        }

        return false;
    }    
}