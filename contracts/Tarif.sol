// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OnlyOwner.sol";
import "./TarifUsageLib.sol";

contract TarifsStoreBase is OnlyOwner {
    uint256[] public tarifs;

    function getAll() public view returns (uint256[] memory) {
        return tarifs;
    }

    function setAll(uint256[] memory _tarifs) public onlyOwner {
        tarifs = _tarifs;
    }

    // // Static tarif data (not changable)
    function tarifsCount() public view returns (uint256) {
        return tarifs.length;
    }

    // // Static tarif data (not changable)
    // function tarif(uint16 _key) public view returns (uint256) {
    //     for (uint8 i = 0; i < tarifs.length; i++)
    //         if (TarifDataLib.tarifKey(tarifs[i]) == _key) return tarifs[i];
    //     return 0;
    // }

    // function clear() public onlyOwner {
    //     tarifs = new uint256[](0);
    // }

    function exists(uint256 _tarif) public view returns (bool) {
        uint16 key = TarifDataLib.tarifKey(_tarif);
        for (uint8 i = 0; i < tarifs.length; i++) {
            if (TarifDataLib.tarifKey(tarifs[i]) == key) return true;
        }
        return false;
    }

    // // Function to add a new tariff
    // function append(uint256 _tarif) public onlyOwner {
    //     require(!exists(_tarif) );
    //     tarifs.push(_tarif);
    // }

    function isLast(uint256 _tarif) public view returns (bool) {
        if (tarifs.length == 0) return false;
        return TarifDataLib.tarifKey(_tarif) == TarifDataLib.tarifKey(tarifs[tarifs.length - 1]);
    }
}

contract TarifsStore {
    TarifsStoreBase public clientTarifs;
    TarifsStoreBase public partnerTarifs;

    constructor() {
        clientTarifs = new TarifsStoreBase();
        partnerTarifs = new TarifsStoreBase();

        clientTarifs.setOwner(msg.sender);
        partnerTarifs.setOwner(msg.sender);
    }

    function isT1BetterOrSameT2(uint256 _tarif1, uint256 _tarif2) public view returns (bool) {
        bool t2Found = false;
        uint16 k1 = TarifDataLib.tarifKey(_tarif1);
        uint16 k2 = TarifDataLib.tarifKey(_tarif2);

        if (k2 == 0) return true; // Any model better then none.
        // if (k1 == k2) return true;

        for (uint8 i = 0; i < partnerTarifs.tarifsCount(); i++) {
            if (TarifDataLib.tarifKey(partnerTarifs.tarifs(i)) == k2) t2Found = true;
            if (TarifDataLib.tarifKey(partnerTarifs.tarifs(i)) == k1) return t2Found;
        }

        return false;
    }
}
