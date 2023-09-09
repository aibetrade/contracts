const Referal = artifacts.require("Referal");
const ERC20Token = artifacts.require("ERC20Token");
var UsersTarifsStore = artifacts.require("UsersTarifsStore");
var UsersFinanceStore = artifacts.require("UsersFinanceStore");
var UsersTreeStore = artifacts.require("UsersTreeStore");


const TarifsStoreBase = artifacts.require("TarifsStoreBase");
const { time } = require('@openzeppelin/test-helpers');

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */

const zeroAddress = '0x0000000000000000000000000000000000000000';
const oneAddress = '0x0000000000000000000000000000000000000001';
const REGISTRATION_KEY = 65535;

const { TarifData } = require('../utils/tarif');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

const { clientTarifs, partnerTarifs, inviteBonusHash } = require('./tarifs-data')

const tarifs = [...clientTarifs, ...partnerTarifs]

function getInviteBonus(mTairf, uTarif) {
    return inviteBonusHash.filter(x => x[0] == mTairf.pack() && x[1] == uTarif.pack())[0][2]
}

function maxClientTarif() {
    return clientTarifs[clientTarifs.length - 1];
}

let stack = null

const conf = require("../migrations/conf.json")

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

async function makeBalancer() {

    const dif = (a, b) => Math.round(a * 100 - b * 100) / 100

    const balancer = {
        records: [],
        accs: [],

        async append(name = 'after') {
            const { erc20, uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, cWallet, qWallet, mWallet, usersFinance } = await init();

            this.accs = [uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, cWallet, qWallet, mWallet, usersFinance.address]
            const bals = {}
            for (let acc of this.accs) {
                bals[acc] = await fromErc20(await erc20.balanceOf(acc))
            }

            const rec = {
                name,
                company: await fromErc20(await erc20.balanceOf(cWallet)),
                quart: await fromErc20(await erc20.balanceOf(qWallet)),
                magic: await fromErc20(await erc20.balanceOf(mWallet)),
                finance: await fromErc20(await erc20.balanceOf(usersFinance.address)),

                uAcc: await fromErc20(await erc20.balanceOf(uAcc)),
                m1Acc: await fromErc20(await erc20.balanceOf(m1Acc)),
                m2Acc: await fromErc20(await erc20.balanceOf(m2Acc)),
                m3Acc: await fromErc20(await erc20.balanceOf(m3Acc)),
                m4Acc: await fromErc20(await erc20.balanceOf(m4Acc)),
                m5Acc: await fromErc20(await erc20.balanceOf(m5Acc)),
                bals
            }

            this.records.push(rec)
        },

        printAll() {
            let last = null
            for (let rec of this.records) {
                console.log('Step', rec.name)

                console.table(rec)

                if (last) {
                    // console.log('Diff', `Company: ${rec.company - last.company}`, `Quart: ${rec.quart - last.quart}`, `Magic: ${rec.magic - rec.magic}`, `C1: ${rec.c1 - last.c1}`, `C2: ${rec.c2 - rec.c2}`,)
                    console.log('Diff', `C: ${dif(rec.company, last.company)}`, `Q: ${dif(rec.quart, last.quart)}`, `M: ${dif(rec.magic, last.magic)}`, `C1: ${dif(rec.c1, last.c1)}`, `C2: ${dif(rec.c2, last.c2)}`,)
                }
                last = rec
            }
        },

        print(name) {
            const recs = this.records.filter(x => x.name == name)
            for (let rec of recs) {
                console.log(rec)
            }
        },

        diff(nameb, namea) {
            namea = namea || this.records[0].name
            nameb = nameb || this.records[1].name

            const reca = this.records.filter(x => x.name == namea)[0]
            const recb = this.records.filter(x => x.name == nameb)[0]

            if (reca && recb) {
                const diffRec = {
                    name: `${nameb} - ${namea}`,
                    company: dif(recb.company, reca.company),
                    quart: dif(recb.quart, reca.quart),
                    magic: dif(recb.magic, reca.magic),
                    finance: dif(recb.finance, reca.finance),

                    uAcc: dif(recb.uAcc, reca.uAcc),
                    m1Acc: dif(recb.m1Acc, reca.m1Acc),
                    m2Acc: dif(recb.m2Acc, reca.m2Acc),
                    m3Acc: dif(recb.m3Acc, reca.m3Acc),
                    m4Acc: dif(recb.m4Acc, reca.m4Acc),
                    m5Acc: dif(recb.m5Acc, reca.m5Acc),
                    bals: this.accs.reduce((s, c) => ({ ...s, [c]: dif(recb.bals[c], reca.bals[c]) }), {})
                }

                return diffRec
            }
            else
                return {}
        },

        printDiff(nameb, namea) {
            console.log(this.diff(nameb, namea))
        }
    }

    await balancer.append('init')

    return balancer
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


async function userHasCTarif(ctarif, acc = null) {
    const { referal, usersTarifsStore, accounts } = await init();

    acc = acc || accounts[0]

    const ucTarif = await usersTarifsStore.cTarifs(acc)
    assert.deepEqual(ctarif, TarifData.fromPack(ucTarif.tarif))
}

async function userHasPTarif(ptarif, acc = null) {
    const { referal, usersTarifsStore, accounts } = await init();

    acc = acc || accounts[0]

    const upTarif = await usersTarifsStore.pTarifs(acc)
    assert.deepEqual(ptarif, TarifData.fromPack(upTarif.tarif))
}

async function getLastBuy(acc = null) {
    const { usersTarifsStore, accounts } = await init();
    acc = acc || accounts[0]
    const buyHistory = await usersTarifsStore.getBuyHistory(acc)
    return buyHistory[buyHistory.length - 1]
}

// Get all comsas
async function getAllComsasOf(partner) {
    const { referal, usersTarifsStore, C1, C2 } = await init();

    let result = []
    const refs = await usersTarifsStore.getReferals(partner)
    for (let ref of refs) {
        const history = await usersTarifsStore.getBuyHistory(ref)

        const history2 = history.map((x, i) => {
            const { timestamp, tarif, count } = x
            const tar = TarifData.fromPack(tarif)
            const { key, price, isRejected, isComsaTaken } = tar
            return { client: ref, index: i, count, price, key, isRejected, isComsaTaken, timestamp, tarif }
        })

        result = [...result, ...history2]
    }

    return result
}

async function printUserTarifs(acc = null, msg) {
    const { referal, accounts } = await init();
    acc = acc || accounts[0]
    const user = await referal.users(acc)

    console.log(msg)
    console.log(`USER=${acc}, REG(${user.registered})`)
    console.log(`Mentor=${user.mentor}`)
    console.log(`PN(${TarifData.fromPack(user.partnerTarif).key})`, user.partnerTarif.toString(), user.partnerTarifAt.toString(), user.partnerTarifUsage.toString())
    console.log(`CN(${TarifData.fromPack(user.clientTarif).key})`, user.clientTarif.toString(), user.clientTarifAt.toString())
    console.log(`RB(${TarifData.fromPack(user.rollbackTarif).key})`, user.rollbackTarif.toString(), user.rollbackDate.toString(), user.rollbackUsage.toString())
}

async function prettyHistory(acc = null) {
    const { referal, UsersTarifsStore, accounts } = await init();
    acc = acc || accounts[0]

    const history = (await UsersTarifsStore.getBuyHistory(acc)).map((x, i) => {
        const { timestamp, tarif, count } = x
        const tar = TarifData.fromPack(tarif)
        const { key, price, isRejected, isComsaTaken } = tar
        return { client: acc, index: i, count: parseInt(count), price, key, isRejected, isComsaTaken, timestamp, tarif }
    })

    return history
}

function prettyHistoryRec(rec) {
    const { from, timestamp, tarif, count } = rec
    const tar = TarifData.fromPack(tarif)
    const { key, price, isRejected, isComsaTaken } = tar
    return { client: from, count: parseInt(count), price, key, isRejected, isComsaTaken, timestamp, tarif }
}

async function printBuyHistory(acc = null) {
    const { referal, accounts, UsersTarifsStore } = await init();
    acc = acc || accounts[0]

    const history = (await UsersTarifsStore.getBuyHistory(acc)).map((x, i) => {
        const { timestamp, tarif, count } = x
        const tar = TarifData.fromPack(tarif)
        const { key, price, isRejected, isComsaTaken } = tar
        return { client: acc, index: i, count: parseInt(count), price, key, isRejected, isComsaTaken, timestamp, tarif }
    })

    console.log(history)
}

async function register(acc = null) {
    const { referal, usersFinance, usersTarifsStore, erc20 } = await init();
    acc = acc || accounts[0]

    const regPrice = await referal.registerPrice();
    await erc20.approve(usersFinance.address, await toErc20(regPrice), { from: acc });
    const bal = await makeBalancer()
    await referal.regitsterPartner({ from: acc })
    await bal.append('after')

    const dif = bal.diff('after', 'init')

    // Check money transfer
    assert.deepEqual(dif.company, Number(regPrice))
    assert.deepEqual(dif.bals[acc.toString()], -Number(regPrice))

    const reg = await usersTarifsStore.registered(acc)
    assert.deepEqual(reg, true)

    const usageAfter = prettyUsage(await usersTarifsStore.usage(acc))
    assert.deepEqual(usageAfter.level, 1)
}

async function getNextBuyInfo(tarif, acc) {
    const { usersTarifsStore } = await init();

    let buyCount = 1
    let level = 1

    if (tarif.isPartner()) {
        buyCount = Number(await usersTarifsStore.getNextBuyCount(acc, tarif.pack()))
        level = Number(await usersTarifsStore.getNextLevel(acc, tarif.pack()))
    }

    return {
        buyCount,
        level,
        price: tarif.price * buyCount,
        newSlots: tarif.numSlots * buyCount,
        newLVSlots: tarif.numLVSlots * buyCount
    }
}

async function getBuyPriceDollar(tarif, acc = null) {
    const nextBuyInfo = await getNextBuyInfo(tarif, acc)
    return nextBuyInfo.price
}

function prettyUsage(u) {
    return Object.keys(u).filter(x => isNaN(x)).reduce((s, c) => ({ ...s, [c]: Number(u[c]) }), {})
}

async function buyTarif(tarif, acc = null) {
    const { erc20, referal, usersTarifsStore, usersFinance, accounts } = await init();
    acc = acc || accounts[0]

    const refBalanceBefore = await erc20.balanceOf(usersFinance.address)

    const ucTarifWas = await usersTarifsStore.cTarifs(acc)
    const upTarifWas = await usersTarifsStore.pTarifs(acc)
    const usageBefore = prettyUsage(await usersTarifsStore.usage(acc))

    const buyHistoryWas = await usersFinance.getBuyHistory(acc)
    const buyInfoBefore = await getNextBuyInfo(tarif, acc)

    const price = await getBuyPriceDollar(tarif, acc)
    const wasPartnerTarifActive = await usersTarifsStore.isPartnerTarifActive(acc)

    // const lastBuy2 = await usersFinance.getLastBuy(acc)
    // console.log('lastBuy2===', lastBuy2)

    const bal = await makeBalancer()

    // --- Buy logic ---
    await erc20.approve(usersFinance.address, await toErc20(price), { from: acc });

    const approved = await erc20.allowance(acc, usersFinance.address)
    assert.equal(await fromErc20(approved), price);

    if (tarif.isPartner())
        await referal.buyPartnerTarif(tarif.pack(), { from: acc })
    else
        await referal.buyClientTarif(tarif.pack(), { from: acc })
    // === Buy logic ===

    await bal.append("after")
    // bal.printDiff("after", "init")

    const usageAfter = prettyUsage(await usersTarifsStore.usage(acc))

    // const refBalanceAfter = await erc20.balanceOf(usersFinance.address)

    // console.log(Number(refBalanceBefore), Number(refBalanceAfter), await fromErc20(refBalanceAfter.sub(refBalanceBefore)))

    // assert.deepEqual(await fromErc20(refBalanceAfter.sub(refBalanceBefore)), price)
    // if (await fromErc20(refBalanceAfter.sub(refBalanceBefore)) != price) throw "Income incorrect"

    // Check tarif exists
    if (tarif.isPartner())
        await userHasPTarif(tarif, acc)
    else
        await userHasCTarif(tarif, acc)

    // --- Check buy history
    const buyHistory = await usersFinance.getBuyHistory(acc)
    if (buyHistory.length - 1 != buyHistoryWas.length) throw "Buy history not changed"

    const lastBuy = buyHistory[buyHistory.length - 1]
    if (lastBuy.tarif.toString() != tarif.pack()) throw "Last buy tarif not added to history"

    // --- Check rollback saved ok 
    const uRollback = await usersTarifsStore.rollbacks(acc)

    // Check rollback info is correct
    if (tarif.isPartner()) {
        if (uRollback.tarif.toString() != upTarifWas.tarif.toString()) throw "partnerTarif tarif not saved"
        if (uRollback.date.toString() != upTarifWas.boughtAt.toString()) throw "partnerTarif date not saved"
        assert.deepEqual(prettyUsage(uRollback.usage), prettyUsage(usageBefore), true, "partnerTarif usage not saved")
    }

    // --- Check Usage level is correct
    if (tarif.isPartner()) {
        // Ext level
        if (wasPartnerTarifActive) {
            if (upTarifWas.tarif.toString() == tarif.pack().toString()) {
                assert.equal(Number(usageAfter.level - usageBefore.level), 1, "Extend tarif. EXT incorrect")
            }
            else {
                assert.equal(Number(usageAfter.level - usageBefore.level), 0, "Upgrade tarif. EXT incorrect")
            }
        }
        else {
            assert.equal(Number(usageAfter.level), 1, "New tarif must have. EXT=1")
        }

        // console.log('Before', prettyUsage(usageBefore))
        // console.log('After', prettyUsage(usageAfter))
        // console.log('buyInfo', buyInfoBefore)

        assert.equal(usageAfter.level, buyInfoBefore.level, "Give incorrect level")
        assert.equal(usageAfter.freeSlots - usageBefore.freeSlots, tarif.numSlots * buyInfoBefore.buyCount, "Give incorrect slots")
        assert.equal(usageAfter.freeLVSlots - usageBefore.freeLVSlots, tarif.numLVSlots * buyInfoBefore.buyCount, "Give incorrect LV slots")
    }
}

async function toErc20(dollar) {
    const { erc20 } = await init();
    const decimals = await erc20.decimals();
    return BigInt((10 ** Number(decimals)) * Number(dollar));
}

async function fromErc20(wei) {
    const { erc20 } = await init();
    const decimals = await erc20.decimals();
    return Number(Number(wei) / (10 ** Number(decimals)));
}

module.exports = {
    tarifs,
    clientTarifs,
    partnerTarifs,
    zeroAddress,
    oneAddress,

    init,
    span49h,
    span31d,
    span366d,
    mustFail,

    toErc20,
    register,
    buyTarif,
    maxClientTarif,

    makeBalancer,

    userHasCTarif,
    userHasPTarif,

    getNextBuyInfo,
    prettyUsage
}