// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OnlyOwner.sol";

// Static tarif data (not changable)
contract TarifData {
    function isPartner(uint128 _tarif) public pure returns (bool) {
        return getNumSlots(_tarif) > 0;
    }

    function getPrice(uint128 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif);
    }

    function getInvitePercent(uint128 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 1));
    }

    function getNumSlots(uint128 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 2));
    }

    function getComsa(uint128 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 3));
    }

    function hasCompress(uint128 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 4));
    }

    function getNumLVSlots(uint128 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 5));
    }

    function hasMaxLVComsa(uint128 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 6));
    }

    function getLV(uint128 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 7));
    }
}

contract TarifUsage {
    function getUsedSlots(uint64 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif);
    }

    function getUsedLVSlots(uint64 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 1));
    }

    function getExtLevel(uint64 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 2));
    }

    // --- Setters

    function setUsedSlots(
        uint64 _tarif,
        uint16 _value
    ) public pure returns (uint64) {
        return _tarif & (_value);
    }

    function setUsedLVSlots(
        uint64 _tarif,
        uint16 _value
    ) public pure returns (uint64) {
        return _tarif & (_value << (16 * 1));
    }

    function setExtLevel(
        uint64 _tarif,
        uint16 _value
    ) public pure returns (uint64) {
        return _tarif & (_value << (16 * 2));
    }
}

contract TarifsContract is OnlyOwner, TarifData, TarifUsage {
    uint128[] public clientTarifs;
    uint128[] public partnerTarifs;
    mapping(uint128 => bool) public tarifsHash;
    mapping(uint16 => uint8) public pPriceHash;

    // Function to add a new tariff
    function addTarif(uint128 _tarif) public onlyOwner {
        require(tarifsHash[_tarif] == false, "Tarif exists");
        tarifsHash[_tarif] = true;

        if (isPartner(_tarif)) {
            partnerTarifs.push(_tarif);
            pPriceHash[getPrice(_tarif)] = (uint8)(partnerTarifs.length - 1);
        } else clientTarifs.push(_tarif);
    }

    // Function to get the number of tarifs
    function maxClientPrice() public view returns (uint16) {
        require(clientTarifs.length > 0, "No client tarifs added");
        return getPrice(clientTarifs[clientTarifs.length - 1]);
    }

    function getClientTarifCount() public view returns (uint256) {
        return clientTarifs.length;
    }

    function getPartnerTarifCount() public view returns (uint256) {
        return clientTarifs.length;
    }

    function getClientTarifs() public view returns(uint128[] memory) {
        return clientTarifs;
    }

    function getPartnerTarifs() public view returns(uint128[] memory) {
        return partnerTarifs;
    }
}
