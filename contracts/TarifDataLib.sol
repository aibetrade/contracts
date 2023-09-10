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

    function getMatrixBonus(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 2));
    }

    function getNumSlots(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 3));
    }

    function getComsa(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 4));
    }

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

    // function isRejected(uint256 _tarif) public pure returns (bool) {
    //     return (uint16)(_tarif >> (16 * 9)) > 0;
    // }

    // function isComsaTaken(uint256 _tarif) public pure returns (bool) {
    //     return (uint16)(_tarif >> (16 * 10)) > 0;
    // }    

    // --- Setters data

    // function setRejected(uint256 _tarif) public pure returns (uint256) {
    //     return _tarif | (1 << (16 * 9));
    // }

    // function setComsaTaken(uint256 _tarif) public pure returns (uint256) {
    //     return _tarif | (1 << (16 * 10));
    // }

    // ---
    function isRegister(uint256 _tarif) public pure returns (bool) {
        return tarifKey(_tarif) == REGISTRATION_KEY;
    }

    function isPartner(uint256 _tarif) public pure returns (bool) {
        return getNumSlots(_tarif) > 0;
    }    
}