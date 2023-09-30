const { partnerTarifs, clientTarifs } = require("./utils-conf");
const { makeBalancer, buyTarif } = require("./utils-finance");
const { init, span49h } = require("./utils-system");
const { maxClientTarif, maxParentTarif } = require("./utils-tarifs");

module.exports = () => {
    it("Build net uAcc -> m1Acc -> m2Acc -> m3Acc -> m4Acc -> m5Acc", async function () {
        const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, usersTree, usersTarifsStore } = await init();

        await usersTree.adminSetMentor(uAcc, m1Acc)
        // await usersTree.adminSetMentor(uAcc, oneAddress)
        await usersTree.adminSetMentor(m1Acc, m2Acc)
        await usersTree.adminSetMentor(m2Acc, m3Acc)
        await usersTree.adminSetMentor(m3Acc, m4Acc)
        await usersTree.adminSetMentor(m4Acc, m5Acc)

        assert.equal(await usersTree.getMentor(uAcc), m1Acc)
        assert.equal(await usersTree.getMentor(m1Acc), m2Acc)
        assert.equal(await usersTree.getMentor(m2Acc), m3Acc)
        assert.equal(await usersTree.getMentor(m3Acc), m4Acc)
        assert.equal(await usersTree.getMentor(m4Acc), m5Acc)

        await usersTarifsStore.adminSetCTarif(m1Acc, maxClientTarif().pack())
        await usersTarifsStore.adminSetCTarif(m2Acc, maxClientTarif().pack())
        await usersTarifsStore.adminSetCTarif(m3Acc, maxClientTarif().pack())
        await usersTarifsStore.adminSetCTarif(m4Acc, maxClientTarif().pack())
        await usersTarifsStore.adminSetCTarif(m5Acc, maxClientTarif().pack())

        await usersTarifsStore.adminSetRegistered(uAcc)
        await usersTarifsStore.adminSetRegistered(m1Acc)
        await usersTarifsStore.adminSetRegistered(m2Acc)
        await usersTarifsStore.adminSetRegistered(m3Acc)
        await usersTarifsStore.adminSetRegistered(m4Acc)
        await usersTarifsStore.adminSetRegistered(m5Acc)
    })

    it("Set all pTarif 0", async function () {
        const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, usersTree, usersTarifsStore } = await init();

        await usersTarifsStore.adminSetPTarif(m1Acc, partnerTarifs[0].pack(), 1)
        await usersTarifsStore.adminSetPTarif(m2Acc, partnerTarifs[0].pack(), 1)
        await usersTarifsStore.adminSetPTarif(m3Acc, partnerTarifs[0].pack(), 1)
        await usersTarifsStore.adminSetPTarif(m4Acc, partnerTarifs[0].pack(), 1)
        await usersTarifsStore.adminSetPTarif(m5Acc, partnerTarifs[0].pack(), 1)
    })

    it("uAcc buy c tarif", async function () {
        const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, referal, usersFinance, usersTree, usersTarifsStore } = await init();

        await span49h();
        assert.equal(await usersFinance.comsaExists(uAcc), false)
        assert.equal(await referal.canTakeComsa(uAcc), false)
        const bal = await makeBalancer()

        await buyTarif(clientTarifs[0], uAcc)

        await bal.append()
        console.log(bal.diff().ext2)

        const pays = await usersFinance.getPayHistory(m1Acc)
        console.log(pays)
    })

    it("Set all pTarif 3", async function () {
        const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, usersTarifsStore } = await init();

        await usersTarifsStore.adminSetCTarif(m1Acc, maxClientTarif().pack())
        await usersTarifsStore.adminSetCTarif(m2Acc, maxClientTarif().pack())
        await usersTarifsStore.adminSetCTarif(m3Acc, maxClientTarif().pack())
        await usersTarifsStore.adminSetCTarif(m4Acc, maxClientTarif().pack())
        await usersTarifsStore.adminSetCTarif(m5Acc, maxClientTarif().pack())

        await usersTarifsStore.adminSetPTarif(m1Acc, maxParentTarif().pack(), 1)
        await usersTarifsStore.adminSetPTarif(m2Acc, maxParentTarif().pack(), 1)
        await usersTarifsStore.adminSetPTarif(m3Acc, maxParentTarif().pack(), 1)
        await usersTarifsStore.adminSetPTarif(m4Acc, maxParentTarif().pack(), 1)
        await usersTarifsStore.adminSetPTarif(m5Acc, maxParentTarif().pack(), 1)

        await usersTarifsStore.adminSetRank(m1Acc, 3)
        await usersTarifsStore.adminSetRank(m2Acc, 3)
        await usersTarifsStore.adminSetRank(m3Acc, 3)
        await usersTarifsStore.adminSetRank(m4Acc, 3)
        await usersTarifsStore.adminSetRank(m5Acc, 3)
    })

    it("uAcc buy c tarif step 2", async function () {
        const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, referal, usersFinance, usersTree, usersTarifsStore } = await init();

        await span49h();

        assert.equal(await usersFinance.comsaExists(uAcc), false)
        assert.equal(await referal.canTakeComsa(uAcc), false)

        const bal = await makeBalancer()
        await buyTarif(clientTarifs[0], uAcc)
        await bal.append()

        console.log('diff2', bal.diff().ext2)
    })

    it("uAcc buy pTarif and processComsa", async function () {
        const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, referal, usersFinance, usersTree, usersTarifsStore } = await init();

        await span49h();

        assert.equal(await usersFinance.comsaExists(uAcc), false)
        assert.equal(await referal.canTakeComsa(uAcc), false)

        const bal = await makeBalancer()
        await usersTarifsStore.adminSetCTarif(uAcc, maxClientTarif().pack())
        await usersTarifsStore.adminSetRegistered(uAcc)
        await usersTarifsStore.setUsage(uAcc, 0, 0, 100)

        await buyTarif(maxParentTarif(), uAcc)
        // await buyTarif(maxClientTarif(), uAcc)

        await span49h();

        assert.equal(await usersFinance.comsaExists(uAcc), true)
        assert.equal(await referal.canTakeComsa(uAcc), true)

        await bal.append()
        console.log(bal)

        const buy = await usersFinance.getLastBuy(uAcc)
        console.log(buy)

        await referal.takeComsa(uAcc)

        await bal.append()

        console.log('diff after', bal.diff().ext2)
    })
}