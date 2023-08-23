// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OnlyOwner.sol";

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

    function getComsa(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 4));
    }

    function hasCompress(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 5));
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

    function setIsRejected(uint256 _tarif, bool _value) public pure returns (uint256) {
        return _value ? (_tarif & (1 << (16 * 9))) : _tarif;
    }

    function setIsComsaTaken(uint256 _tarif, bool _value) public pure returns (uint256) {
        return _value ? (_tarif & (1 << (16 * 10))) : _tarif;
    }


    // ---
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

    // --- Setters

    function setUsedSlots(
        uint64 _usage,
        uint16 _value
    ) public pure returns (uint64) {
        return _usage & (_value);
    }

    function setUsedLVSlots(
        uint64 _usage,
        uint16 _value
    ) public pure returns (uint64) {
        return _usage & (_value << (16 * 1));
    }

    function setExtLevel(
        uint64 _usage,
        uint16 _value
    ) public pure returns (uint64) {
        return _usage & (_value << (16 * 2));
    }

    // Dynamic info about slots
    function hasSlot(uint256 _tarif, uint64 _usage) public pure returns (bool) {
        return
            getUsedSlots(_usage) <
            getNumSlots(_tarif) * (getExtLevel(_usage) + 1);
    }

    function useSlot(uint64 _usage) public pure returns (uint64) {
        return setUsedSlots(_usage, getUsedSlots(_usage) + 1);
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
        return setUsedLVSlots(_usage, getUsedLVSlots(_usage) + 1);
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

    // Function to add a new tariff
    function append(uint256 _tarif) public onlyOwner {
        require(!exists(_tarif), "Tarif exists");
        tarifs.push(_tarif);
    }

    function isLast(uint256 _tarif) public view returns (bool) {
        if (tarifs.length == 0) return false;
        return tarifKey(_tarif) == tarifKey(tarifs[tarifs.length - 1]);
    }
}

contract TarifsContract is TarifReader {
    TarifsContractBase public ClientTarifs;
    TarifsContractBase public PartnerTarifs;

    constructor() {
        ClientTarifs = new TarifsContractBase();
        PartnerTarifs = new TarifsContractBase();

        ClientTarifs.setOwner(msg.sender);
        PartnerTarifs.setOwner(msg.sender);
    }

    function isT1BetterOrSameT2(uint256 _tarif1, uint256 _tarif2) public view returns (bool){
        bool t1Found = false;
        uint16 k1 = tarifKey(_tarif1);
        uint16 k2 = tarifKey(_tarif2);

        if (k1 == k2) return true;

        for (uint8 i = 0; i < PartnerTarifs.tarifsCount(); i++){
            if (tarifKey(PartnerTarifs.tarifs(i)) == k2) return t1Found;
            if (tarifKey(PartnerTarifs.tarifs(i)) == k1) t1Found = true;
        }

        return false;
    }

    function isLastClientTarif(uint256 _tarif) public view returns(bool){
        return ClientTarifs.isLast(_tarif);
    }
}
