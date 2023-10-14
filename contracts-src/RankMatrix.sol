// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MultyOwner.sol";

contract RankMatrix is MultyOwner {
    constructor() {}

    uint8 public maxRank;
    uint8 public maxLevel;
    mapping(uint16 => uint8) public matrix;
    
    function toKey(uint16 _rank, uint16 _level) pure public returns (uint16) {
        return (_rank << 8 ) | _level;
    }

    function fromKey(uint16 key) pure public returns (uint8 _rank, uint8 _level) {
        return (uint8((key >> 8) & 0xFF), uint8(key & 0xFF));
    }

    function setMatrix(uint16[] calldata _keys, uint8[] calldata _values) public onlyOwner{
        uint8 maxRank_ = 0;
        uint8 maxLevel_ = 0;

        for (uint16 i = 0; i < _keys.length; i++){
            (uint8 rank, uint8 level) = fromKey(_keys[i]);
            if (rank > maxRank_) maxRank_ = rank;
            if (level > maxLevel_) maxLevel_ = level;
            matrix[_keys[i]] = _values[i];
        }

        maxRank = maxRank_;
        maxLevel = maxLevel_;
    }
}