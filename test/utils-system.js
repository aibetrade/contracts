const Referal = artifacts.require("Referal");
const ERC20Token = artifacts.require("ERC20Token");
var UsersTarifsStore = artifacts.require("UsersTarifsStore");
var UsersFinanceStore = artifacts.require("UsersFinanceStore");
var UsersTreeStore = artifacts.require("UsersTreeStore");
const TarifsStoreBase = artifacts.require("TarifsStoreBase");

const { time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const conf = require("../migrations/conf.json")

const zeroAddress = '0x0000000000000000000000000000000000000000';
const oneAddress = '0x0000000000000000000000000000000000000001';

let stack = null


async function init(isNew = false) {
    if (isNew || !stack) {
        const accounts = await web3.eth.getAccounts()
        const referal = await Referal.deployed()

        const usersTarifsStore = await UsersTarifsStore.at(await referal.usersTarifsStore())

        stack = {
            ...conf,

            referal,
            erc20: await ERC20Token.deployed(),
            accounts,
            usersTarifsStore,
            cliTarifs: await TarifsStoreBase.at(await usersTarifsStore.clientTarifs()),
            parTarifs: await TarifsStoreBase.at(await usersTarifsStore.partnerTarifs()),
            usersFinance: await UsersFinanceStore.at(await referal.usersFinance()),
            usersTree: await UsersTreeStore.at(await referal.usersTree()),

            uAcc: accounts[1],
            m1Acc: accounts[2],
            m2Acc: accounts[3],
            m3Acc: accounts[4],
            m4Acc: accounts[5],
            m5Acc: accounts[6]
        }
    }

    return stack;
}

async function mustFail(prom) {
    try {
        await prom
    }
    catch (ex) {
        return true
    }
    throw "Must fail"
}

const span49h = async () => {
    await time.increase(49 * 3600);
    await time.advanceBlock();
}

const span31d = async () => {
    await time.increase(31 * 24 * 3600);
    await time.advanceBlock();
}

const span366d = async () => {
    await time.increase(366 * 24 * 3600);
    await time.advanceBlock();
}

module.exports = {
    zeroAddress,
    oneAddress,

    init,
    span49h,
    span31d,
    span366d,
    mustFail
}