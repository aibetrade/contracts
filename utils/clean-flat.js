const fs = require('fs')

const sol = fs.readFileSync(__dirname + '/../contracts/plain.sol').toString()
const clean = sol
    .replace(/\/\/ SPDX-License-Identifier: MIT/g, '')
    .replace(/pragma solidity \^0.8.0;/g, '')

const full = "// SPDX-License-Identifier: MIT\n" + "pragma solidity ^0.8.0;\r\n" + clean;

fs.writeFileSync(__dirname + '/../contracts/plain.sol', full)
