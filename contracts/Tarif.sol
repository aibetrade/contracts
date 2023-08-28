// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OnlyOwner.sol";

uint16 constant REGISTRATION_KEY = 65535;


// library TarifReaderLib{
//     function getIsRejected(uint256 _tarif) public pure returns (bool) {
//         return (uint16)(_tarif >> (16 * 9)) > 0;
//     }

//     function getIsComsaTaken(uint256 _tarif) public pure returns (bool) {
//         return (uint16)(_tarif >> (16 * 10)) > 0;
//     }
// }


contract TarifReader {
    // Static tarif data (not changable)
    function tarifKey(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif);
    }

    function getPrice(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 1));
    }

    function getMatrixBonus(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 2));
    }    

    function getNumSlots(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 3));
    }

    // function getComsa(uint256 _tarif) public pure returns (uint16) {
    //     return (uint16)(_tarif >> (16 * 4));
    // }

    function hasCompress(uint256 _tarif) public pure returns (bool) {
        return (uint16)(_tarif >> (16 * 5)) > 0;
    }

    function getNumLVSlots(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 6));
    }

    function getLV(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 7));
    }

    function getFullNum(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 8));
    }

    function getIsRejected(uint256 _tarif) public pure returns (bool) {
        return (uint16)(_tarif >> (16 * 9)) > 0;
    }

    function getIsComsaTaken(uint256 _tarif) public pure returns (bool) {
        return (uint16)(_tarif >> (16 * 10)) > 0;
    }

    // --- Setters data

    function setRejected(uint256 _tarif) public pure returns (uint256) {
        return _tarif | (1 << (16 * 9));
    }

    function setComsaTaken(uint256 _tarif) public pure returns (uint256) {
        return _tarif | (1 << (16 * 10));
    }

    // ---
    function isRegister(uint256 _tarif) public pure returns (bool) {
        return tarifKey(_tarif) == REGISTRATION_KEY;
    }

    function isPartner(uint256 _tarif) public pure returns (bool) {
        return getNumSlots(_tarif) > 0;
    }

    // Dynamic tarif usage data
    function getUsedSlots(uint64 _usage) public pure returns (uint16) {
        return (uint16)(_usage);
    }

    function getUsedLVSlots(uint64 _usage) public pure returns (uint16) {
        return (uint16)(_usage >> (16 * 1));
    }

    function getExtLevel(uint64 _usage) public pure returns (uint16) {
        return (uint16)(_usage >> (16 * 2));
    }

    function getFilled(uint64 _usage) public pure returns (uint16) {
        return (uint16)(_usage >> (16 * 3));
    }

    // --- Setters

    // Dynamic info about slots
    function buildUsage(uint64 _usedSlots, uint64 _usedLVSlots, uint64 _extLevel, uint64 _filled) public pure returns (uint64){
        return _usedSlots | (_usedLVSlots << (16 * 1)) | (_extLevel << (16 * 2)) | (_filled << (16 * 3));
    }

    function hasSlot(uint256 _tarif, uint64 _usage) public pure returns (bool) {
        return
            getUsedSlots(_usage) <
            getNumSlots(_tarif) * (getExtLevel(_usage) + 1);
    }

    function useSlot(uint64 _usage) public pure returns (uint64) {
        return buildUsage(getUsedSlots(_usage) + 1, getUsedLVSlots(_usage), getExtLevel(_usage), getFilled(_usage));
    }

    function hasLVSlot(
        uint256 _tarif,
        uint64 _usage
    ) public pure returns (bool) {
        return
            getUsedLVSlots(_usage) <
            getNumLVSlots(_tarif) * (getExtLevel(_usage) + 1);
    }

    function useLVSlot(uint64 _usage) public pure returns (uint64) {
        return buildUsage(getUsedSlots(_usage), getUsedLVSlots(_usage) + 1, getExtLevel(_usage), getFilled(_usage));
    }

    function useFill(uint64 _usage) public pure returns (uint64) {
        return buildUsage(getUsedSlots(_usage), getUsedLVSlots(_usage), getExtLevel(_usage), getFilled(_usage) + 1);
    }    
}

contract TarifsContractBase is OnlyOwner {
    uint256[] public tarifs;

    function getAll() public view returns (uint256[] memory) {
        return tarifs;
    }

    // Static tarif data (not changable)
    function tarifsCount() public view returns (uint256) {
        return tarifs.length;
    }

    // Static tarif data (not changable)
    function tarifKey(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif);
    }

    // Static tarif data (not changable)
    function tarif(uint16 _key) public view returns (uint256) {
        for (uint8 i = 0; i < tarifs.length; i++)
            if (tarifKey(tarifs[i]) == _key) return tarifs[i];
        return 0;
    }

    function clear() public onlyOwner {
        tarifs = new uint256[](0);
    }

    function exists(uint256 _tarif) public view returns (bool) {
        uint16 key = tarifKey(_tarif);
        for (uint8 i = 0; i < tarifs.length; i++) {
            if (tarifKey(tarifs[i]) == key) return true;
        }
        return false;
    }

    function getIsRejected(uint256 _tarif) public pure returns (bool) {
        return (uint16)(_tarif >> (16 * 9)) > 0;
    }

    function getIsComsaTaken(uint256 _tarif) public pure returns (bool) {
        return (uint16)(_tarif >> (16 * 10)) > 0;
    }

    // Function to add a new tariff
    function append(uint256 _tarif) public onlyOwner {
        require(!exists(_tarif) && !getIsRejected(_tarif) && !getIsComsaTaken(_tarif));        
        tarifs.push(_tarif);
    }

    function isLast(uint256 _tarif) public view returns (bool) {
        if (tarifs.length == 0) return false;
        return tarifKey(_tarif) == tarifKey(tarifs[tarifs.length - 1]);
    }
}

contract TarifsContract is TarifReader {
    TarifsContractBase public clientTarifs;
    TarifsContractBase public partnerTarifs;

    constructor() {
        clientTarifs = new TarifsContractBase();
        partnerTarifs = new TarifsContractBase();

        clientTarifs.setOwner(msg.sender);
        partnerTarifs.setOwner(msg.sender);
    }

    function isT1BetterOrSameT2(uint256 _tarif1, uint256 _tarif2) public view returns (bool){
        bool t2Found = false;
        uint16 k1 = tarifKey(_tarif1);
        uint16 k2 = tarifKey(_tarif2);

        if (k2 == 0) return true; // Any model better then none.
        // if (k1 == k2) return true;

        for (uint8 i = 0; i < partnerTarifs.tarifsCount(); i++){
            if (tarifKey(partnerTarifs.tarifs(i)) == k2) t2Found = true;
            if (tarifKey(partnerTarifs.tarifs(i)) == k1) return t2Found;
        }

        return false;
    }

    // function isLastClientTarif(uint256 _tarif) public view returns(bool){
    //     return clientTarifs.isLast(_tarif);
    // }
}
