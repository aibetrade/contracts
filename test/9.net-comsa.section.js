const { makeBalancer, buyTarif } = require("./utils-finance");
const { init, span49h } = require("./utils-system");
const { partnerTarifs, maxClientTarif, clientTarifs, getUsage } = require("./utils-tarifs");

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
        const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, usersTree, usersTarifsStore } = await init();

        await usersTarifsStore.adminSetPTarif(m1Acc, partnerTarifs[3].pack(), 1)
        await usersTarifsStore.adminSetPTarif(m2Acc, partnerTarifs[3].pack(), 1)
        await usersTarifsStore.adminSetPTarif(m3Acc, partnerTarifs[3].pack(), 1)
        await usersTarifsStore.adminSetPTarif(m4Acc, partnerTarifs[3].pack(), 1)
        await usersTarifsStore.adminSetPTarif(m5Acc, partnerTarifs[3].pack(), 1)

        const bal = await makeBalancer()
        // console.log(bal.records[0].ext2)
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
}