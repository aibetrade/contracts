const Referal = artifacts.require("Referal");
const ERC20Token = artifacts.require("ERC20Token");
var UsersTarifsStore = artifacts.require("UsersTarifsStore");
var UsersFinanceStore = artifacts.require("UsersFinanceStore");
var UsersTreeStore = artifacts.require("UsersTreeStore");
const TarifsStoreBase = artifacts.require("TarifsStoreBase");
const RankMatrix = artifacts.require("RankMatrix");

const conf = require("../migrations/history/conf.json")
const deploy = require("../migrations/history/deploy.json")

const zeroAddress = '0x0000000000000000000000000000000000000000';
const oneAddress = '0x0000000000000000000000000000000000000001';

let stack = null

async function init(isNew = false) {
    if (isNew || !stack) {
        const accounts = await web3.eth.getAccounts()        
        const referal = await Referal.at(deploy.referal)

        const usersTarifsStore = await UsersTarifsStore.at(await referal.usersTarifsStore())
        const usersFinance = await UsersFinanceStore.at(await referal.usersFinance())

        stack = {
            ...conf,

            referal,
            // erc20: await ERC20Token.deployed(),
            erc20: await ERC20Token.at(await usersFinance.erc20()),
            accounts,
            usersTarifsStore,
            cliTarifs: await TarifsStoreBase.at(await usersTarifsStore.clientTarifs()),
            parTarifs: await TarifsStoreBase.at(await usersTarifsStore.partnerTarifs()),
            usersFinance,
            usersTree: await UsersTreeStore.at(await referal.usersTree()),
            rankMatrix: await RankMatrix.at(await referal.rankMatrix()),

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

const span = async time => {
    const body = JSON.stringify({ method: "evm_increaseTime", params: [time] })
    await fetch(web3.currentProvider.host, { method: "POST", body })
    await fetch(web3.currentProvider.host, { method: "POST", body: JSON.stringify({ method: "evm_mine", params: [] }) })
}

const span49h = async () => {
    return span(49 * 3600)
    // await time.increase(49 * 3600);
    // await time.advanceBlock();
}

const span31d = async () => {
    return span(31 * 24 * 3600)
    // await time.increase(31 * 24 * 3600);
    // await time.advanceBlock();
}

const span366d = async () => {
    return span(366 * 24 * 3600)
    // await time.increase(366 * 24 * 3600);
    // await time.advanceBlock();
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