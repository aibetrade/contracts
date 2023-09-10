const { TarifData } = require("../utils/tarif");
const { buyTarif, getNextBuyInfo, makeBalancer, register } = require("./utils-finance");
const { init, span49h, oneAddress } = require("./utils-system");
const { userHasPTarif, userHasCTarif, partnerTarifs, maxClientTarif, getUsage } = require("./utils-tarifs");


module.exports = () => {
    it("Can NOT reject if no parent traif or time is up", async function () {
        const { m1Acc, usersTree, usersTarifsStore } = await init();

        await userHasPTarif(TarifData.create())
        await userHasCTarif(TarifData.create())

        assert.equal(await usersTarifsStore.canReject(m1Acc), false)
        await span49h()
        assert.equal(await usersTarifsStore.canReject(m1Acc), false)

        await usersTree.setMentor(oneAddress, { from: m1Acc })

        await buyTarif(maxClientTarif(), m1Acc)
        assert.equal(await usersTarifsStore.canReject(m1Acc), false)
        await span49h()
        assert.equal(await usersTarifsStore.canReject(m1Acc), false)

        await register(m1Acc)
        assert.equal(await usersTarifsStore.canReject(m1Acc), false)
        await span49h()
        assert.equal(await usersTarifsStore.canReject(m1Acc), false)

        await buyTarif(partnerTarifs[0], m1Acc)
        assert.equal(await usersTarifsStore.canReject(m1Acc), true)
        await span49h()
        assert.equal(await usersTarifsStore.canReject(m1Acc), false)
    })

    it("Check reject 1 lvl", async function () {
        const { m1Acc, usersTree, usersTarifsStore, usersFinance } = await init();

        await usersTarifsStore.adminSetPTarif(m1Acc, TarifData.create().pack(), 1)
        await userHasPTarif(TarifData.create())

        const nextBuy = await getNextBuyInfo(partnerTarifs[0], m1Acc)
        const pTarifBeforeBuy = await usersTarifsStore.pTarifs(m1Acc)
        const usageBeforeBuy = await getUsage(m1Acc)

        await buyTarif(partnerTarifs[0], m1Acc)
        await usersTarifsStore.adminSetFilled(m1Acc)
        await usersTarifsStore.adminFillSlots(m1Acc)
        await usersTarifsStore.adminFillLVSlots(m1Acc)

        assert.equal(await usersTarifsStore.canReject(m1Acc), true)
        const bal = await makeBalancer()
        await usersTarifsStore.reject({ from: m1Acc })
        await bal.append()

        const pTarifAfterReject = await usersTarifsStore.pTarifs(m1Acc)
        const usageAfterReject = await getUsage(m1Acc)
        const buy = await usersFinance.getLastBuy(m1Acc)

        // Check tarif rollback is ok
        assert.equal(pTarifBeforeBuy.tarif.toString(), pTarifAfterReject.tarif.toString())
        // Last buy rejected        
        assert.equal(buy.rejected, true)
        // Usage rejected ok
        assert.deepEqual(usageBeforeBuy, usageAfterReject)

        // Check balances
        const diff = bal.diff()
        assert.equal(diff.bals[m1Acc], nextBuy.price)
        assert.equal(diff.bals[usersFinance.address], -nextBuy.price)
    })

    it("Check buy after reject", async function () {
        const { m1Acc, usersTree, usersTarifsStore, usersFinance } = await init();

        await buyTarif(partnerTarifs[0], m1Acc)
        await usersTarifsStore.reject({ from: m1Acc })
    })

    it("Check reject extend", async function () {
        const { m1Acc, usersTree, usersTarifsStore, usersFinance } = await init();

        await buyTarif(partnerTarifs[0], m1Acc)
        await span49h();
        await usersTarifsStore.adminSetFilled(m1Acc);

        const nextBuy = await getNextBuyInfo(partnerTarifs[0], m1Acc)
        const pTarifBeforeBuy = await usersTarifsStore.pTarifs(m1Acc)

        await buyTarif(partnerTarifs[0], m1Acc)

        assert.equal(await usersTarifsStore.canReject(m1Acc), true)
        const bal = await makeBalancer()
        await usersTarifsStore.reject({ from: m1Acc })
        await bal.append()

        const pTarifAfterReject = await usersTarifsStore.pTarifs(m1Acc)

        // Check tarif rollback is ok
        assert.equal(pTarifBeforeBuy.tarif.toString(), pTarifAfterReject.tarif.toString())

        // Check balances
        const diff = bal.diff()
        assert.equal(diff.bals[m1Acc], nextBuy.price)
        assert.equal(diff.bals[usersFinance.address], -nextBuy.price)
    })    

    it("Check reject upgrade", async function () {
        const { m1Acc, usersTree, usersTarifsStore, usersFinance } = await init();

        await usersTarifsStore.adminSetPTarif(m1Acc, TarifData.create().pack(), 1)
        await userHasPTarif(TarifData.create())

        await buyTarif(partnerTarifs[0], m1Acc)
        await span49h();
        await usersTarifsStore.adminSetFilled(m1Acc);

        await buyTarif(partnerTarifs[0], m1Acc)
        await span49h();
        await usersTarifsStore.adminSetFilled(m1Acc);

        const nextBuy = await getNextBuyInfo(partnerTarifs[2], m1Acc)
        const pTarifBeforeBuy = await usersTarifsStore.pTarifs(m1Acc)

        await buyTarif(partnerTarifs[2], m1Acc)

        assert.equal(await usersTarifsStore.canReject(m1Acc), true)
        const bal = await makeBalancer()

        await usersTarifsStore.reject({ from: m1Acc })
        await bal.append()

        const pTarifAfterReject = await usersTarifsStore.pTarifs(m1Acc)

        // Check tarif rollback is ok
        assert.equal(pTarifBeforeBuy.tarif.toString(), pTarifAfterReject.tarif.toString())

        // Check balances
        const diff = bal.diff()
        assert.equal(diff.bals[m1Acc], nextBuy.price)
        assert.equal(diff.bals[usersFinance.address], -nextBuy.price)
    })      
}