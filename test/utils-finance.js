const { TarifData } = require("../utils/tarif");
const { init } = require("./utils-system");
const { getUsage, getRollback, userHasCTarif, userHasPTarif } = require("./utils-tarifs");

async function getNextBuyInfo(tarif, acc) {
    const { usersTarifsStore } = await init();

    let buyCount = 1
    let level = 1

    if (tarif.isPartner()) {
        buyCount = Number(await usersTarifsStore.getNextBuyCount(acc, tarif.key))
        level = Number(await usersTarifsStore.getNextLevel(acc, tarif.key))
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

    const usageAfter = await getUsage(acc)
    assert.deepEqual(usageAfter.level, 1)
}

async function buyTarif(tarif, acc = null) {
    const { erc20, referal, usersTarifsStore, usersFinance, accounts } = await init();
    acc = acc || accounts[0]

    const upTarifWas = await usersTarifsStore.pTarifs(acc)
    const usageBefore = await getUsage(acc)

    const buyHistoryWas = await usersFinance.getBuyHistory(acc)
    const buyInfoBefore = await getNextBuyInfo(tarif, acc)

    const price = await getBuyPriceDollar(tarif, acc)
    const wasPartnerTarifActive = await usersTarifsStore.isPartnerTarifActive(acc)

    const bal = await makeBalancer()

    // --- Buy logic ---
    await erc20.approve(usersFinance.address, await toErc20(price), { from: acc });

    const approved = await erc20.allowance(acc, usersFinance.address)
    assert.equal(await fromErc20(approved), price);

    if (tarif.isPartner())
        await referal.buyPartnerTarif(tarif.key, { from: acc })
    else
        await referal.buyClientTarif(tarif.key, { from: acc })
    // === Buy logic ===

    await bal.append("after")

    const usageAfter = await getUsage(acc)

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
    const uRollback = await getRollback(acc)

    // Check rollback info is correct
    if (tarif.isPartner()) {
        if (uRollback.tarif.toString() != upTarifWas.tarif.toString()) throw "partnerTarif tarif not saved"
        if (uRollback.date.toString() != upTarifWas.boughtAt.toString()) throw "partnerTarif date not saved"
        assert.deepEqual(uRollback.usage, usageBefore, true, "partnerTarif usage not saved")
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

        assert.equal(usageAfter.level, buyInfoBefore.level, "Give incorrect level")
        // assert.equal(usageAfter.freeSlots - usageBefore.freeSlots, tarif.numSlots * buyInfoBefore.buyCount, "Give incorrect slots")
        // assert.equal(usageAfter.freeLVSlots - usageBefore.freeLVSlots, tarif.numLVSlots * buyInfoBefore.buyCount, "Give incorrect LV slots")
    }

    // --- check current tarif is equal to bought
    {
        if (tarif.isPartner()) {
            const upTarifAfter = await usersTarifsStore.pTarifs(acc)
            const upTarifAfter2 = TarifData.fromPack(upTarifAfter.tarif)
            assert.equal(upTarifAfter.tarif, tarif.pack())
        }
        else{
            const ucTarifAfter = await usersTarifsStore.cTarifs(acc)
            assert.equal(ucTarifAfter.tarif, tarif.pack())
        }
    }
}

async function prettyBalance(bal) {
    const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, cWallet, qcWallet, qpWallet, mWallet, usersFinance } = await init();
    const dic = {
        company: cWallet, quartc: qcWallet, quartp: qpWallet, magic: mWallet, finance: usersFinance.address,
        uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc
    }

    return Object.keys(dic).reduce((s, c) => ({ ...s, [c]: bal[dic[c]] }), {})
}

async function makeBalancer() {

    const dif = (a, b) => Math.round(a * 100 - b * 100) / 100

    const difa = (a, b) => Object.keys(a).reduce((s, c) => ({ ...s, [c]: dif(a[c], b[c]) }), {})
    const difaa = (a, b) => Object.keys(a).reduce((s, c) => ({ ...s, [c]: difa(a[c], b[c]) }), {})

    const balancer = {
        records: [],
        accs: [],

        async append(name = 'after') {
            const { erc20, uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, cWallet, qcWallet, qpWallet, mWallet, usersFinance } = await init();

            this.accs = [uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, cWallet, qcWallet, qpWallet, mWallet, usersFinance.address]

            const accInfo = async acc => {
                const u = await getUsage(acc)

                return {
                    acc,
                    info: {
                        B: await fromErc20(await erc20.balanceOf(acc)),
                        S: u.freeSlots,
                        LV: u.freeLVSlots,
                        F: u.filled,
                        L: u.level
                    }
                }
            }

            const bals = {}
            for (let acc of this.accs) {
                bals[acc] = await fromErc20(await erc20.balanceOf(acc))
            }

            const aaa = await Promise.all(this.accs.map(x => accInfo(x)))
            const ext = aaa.reduce((s, c) => ({ ...s, [c.acc]: c.info }), {})
            const ext2 = await prettyBalance(ext)

            // const pack = {B: 25, S: 10, LV: 35, F: 0},

            const rec = {
                name,
                company: await fromErc20(await erc20.balanceOf(cWallet)),
                quartc: await fromErc20(await erc20.balanceOf(qcWallet)),
                quartp: await fromErc20(await erc20.balanceOf(qpWallet)),
                magic: await fromErc20(await erc20.balanceOf(mWallet)),
                finance: await fromErc20(await erc20.balanceOf(usersFinance.address)),

                uAcc: await fromErc20(await erc20.balanceOf(uAcc)),
                m1Acc: await fromErc20(await erc20.balanceOf(m1Acc)),
                m2Acc: await fromErc20(await erc20.balanceOf(m2Acc)),
                m3Acc: await fromErc20(await erc20.balanceOf(m3Acc)),
                m4Acc: await fromErc20(await erc20.balanceOf(m4Acc)),
                m5Acc: await fromErc20(await erc20.balanceOf(m5Acc)),
                bals,
                ext,
                ext2
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
            const reca = namea ? this.records.filter(x => x.name == namea)[0] : this.records.slice(-2)[0]
            const recb = nameb ? this.records.filter(x => x.name == nameb)[0] : this.records.slice(-1)[0]

            if (reca && recb) {
                const diffRec = {
                    name: `${nameb} - ${namea}`,
                    company: dif(recb.company, reca.company),
                    quartc: dif(recb.quartc, reca.quartc),
                    quartp: dif(recb.quartp, reca.quartp),
                    magic: dif(recb.magic, reca.magic),
                    finance: dif(recb.finance, reca.finance),

                    uAcc: dif(recb.uAcc, reca.uAcc),
                    m1Acc: dif(recb.m1Acc, reca.m1Acc),
                    m2Acc: dif(recb.m2Acc, reca.m2Acc),
                    m3Acc: dif(recb.m3Acc, reca.m3Acc),
                    m4Acc: dif(recb.m4Acc, reca.m4Acc),
                    m5Acc: dif(recb.m5Acc, reca.m5Acc),
                    bals: this.accs.reduce((s, c) => ({ ...s, [c]: dif(recb.bals[c], reca.bals[c]) }), {}),
                    ext2: difaa(recb.ext2, reca.ext2)
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

async function diffBalance(action){
    const bal = await makeBalancer()
    await action
    await bal.append()
    return bal.diff().ext2
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
    fromErc20,
    toErc20,

    register,
    buyTarif,

    makeBalancer,
    getNextBuyInfo,
    diffBalance
}