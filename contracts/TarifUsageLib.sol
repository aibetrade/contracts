// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// uint16 constant REGISTRATION_KEY = 65535;

import "./TarifDataLib.sol";

library TarifUsageLib {
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
    function buildUsage(
        uint64 _usedSlots,
        uint64 _usedLVSlots,
        uint64 _extLevel,
        uint64 _filled
    ) public pure returns (uint64) {
        return
            _usedSlots |
            (_usedLVSlots << (16 * 1)) |
            (_extLevel << (16 * 2)) |
            (_filled << (16 * 3));
    }

    function hasSlot(uint256 _tarif, uint64 _usage) public pure returns (bool) {
        return
            getUsedSlots(_usage) <
            TarifDataLib.getNumSlots(_tarif) * (getExtLevel(_usage) + 1);
    }

    function useSlot(uint64 _usage) public pure returns (uint64) {
        return
            buildUsage(
                getUsedSlots(_usage) + 1,
                getUsedLVSlots(_usage),
                getExtLevel(_usage),
                getFilled(_usage)
            );
    }

    function hasLVSlot(
        uint256 _tarif,
        uint64 _usage
    ) public pure returns (bool) {
        return
            getUsedLVSlots(_usage) <
            TarifDataLib.getNumLVSlots(_tarif) * (getExtLevel(_usage) + 1);
    }

    function useLVSlot(uint64 _usage) public pure returns (uint64) {
        return
            buildUsage(
                getUsedSlots(_usage),
                getUsedLVSlots(_usage) + 1,
                getExtLevel(_usage),
                getFilled(_usage)
            );
    }

    function useFill(uint64 _usage) public pure returns (uint64) {
        return
            buildUsage(
                getUsedSlots(_usage),
                getUsedLVSlots(_usage),
                getExtLevel(_usage),
                getFilled(_usage) + 1
            );
    }   
}