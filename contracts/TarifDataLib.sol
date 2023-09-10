// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

uint16 constant REGISTRATION_KEY = 65535;

library TarifDataLib {
    // // Static tarif data (not changable)
    function tarifKey(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif);
    }

    function getPrice(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 1));
    }

    function getNumSlots(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 2));
    }

    function getComsa(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 3));
    }

    function hasCompress(uint256 _tarif) public pure returns (bool) {
        return (uint16)(_tarif >> (16 * 4)) > 0;
    }

    function getNumLVSlots(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 5));
    }

    function getLV(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 6));
    }

    function getFullNum(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 7));
    }

    // ---
    function isRegister(uint256 _tarif) public pure returns (bool) {
        return tarifKey(_tarif) == REGISTRATION_KEY;
    }

    function isPartner(uint256 _tarif) public pure returns (bool) {
        return getNumSlots(_tarif) > 0;
    }    
}