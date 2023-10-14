const { partnerTarifs, clientTarifs } = require("./utils-conf");
const { makeBalancer, buyTarif, diffBalance } = require("./utils-finance");
const { init, span49h, mustFail, span366d } = require("./utils-system");
const { maxClientTarif, maxParentTarif, getUsage } = require("./utils-tarifs");

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
        // console.log(bal.diff().ext2)

        const pays = await usersFinance.getPayHistory(m1Acc)
        // console.log(pays)
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

        // console.log('diff2', bal.diff().ext2)
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
        // console.log(bal)

        const buy = await usersFinance.getLastBuy(uAcc)
        // console.log(buy)

        await referal.takeComsa(uAcc)

        await bal.append()

        // console.log('diff after', bal.diff().ext2)
    })

    it("Check Team bonus over 0 rank (keep level)", async function () {
        // Build net cli->rank10->rank0->rank10
        const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, usersTarifsStore, usersTree, referal, usersFinance } = await init();

        await usersTree.adminSetMentor(uAcc, m1Acc)
        await usersTree.adminSetMentor(m1Acc, m2Acc)
        await usersTree.adminSetMentor(m2Acc, m3Acc)
        await usersTree.adminSetMentor(m3Acc, m4Acc)
        await usersTree.adminSetMentor(m4Acc, m5Acc)


        await usersTarifsStore.adminSetCTarif(uAcc, maxClientTarif().pack())
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

        span49h()
        // await referal.takeComsa(uAcc)

        {
            await usersTarifsStore.adminSetPTarif(uAcc, 0, 1)

            await usersTarifsStore.adminSetRank(uAcc, 0)
            await usersTarifsStore.adminSetRank(m1Acc, 10)
            await usersTarifsStore.adminSetRank(m2Acc, 0)
            await usersTarifsStore.adminSetRank(m3Acc, 0)
            await usersTarifsStore.adminSetRank(m4Acc, 10)
            await usersTarifsStore.adminSetRank(m5Acc, 10)

            await buyTarif(maxParentTarif(), uAcc)
            assert.equal(await referal.canTakeComsa(uAcc), false)
            await mustFail(referal.takeComsa(uAcc))

            await span49h()
            assert.equal(await referal.canTakeComsa(uAcc), true)

            const bal = await makeBalancer()
            await referal.takeComsa(uAcc)
            await bal.append()

            const { ext2 } = bal.diff()

            assert.equal(ext2.m1Acc.B, 162.33)
            assert.equal(ext2.m2Acc.B, 0)
            assert.equal(ext2.m3Acc.B, 0)
            assert.equal(ext2.m4Acc.B, 97.4)
            assert.equal(ext2.m5Acc.B, 64.93)
        }

        {
            await usersTarifsStore.adminSetPTarif(uAcc, 0, 1)

            await usersTarifsStore.adminSetRank(uAcc, 0)
            await usersTarifsStore.adminSetRank(m1Acc, 10)
            await usersTarifsStore.adminSetRank(m2Acc, 2)
            await usersTarifsStore.adminSetRank(m3Acc, 10)
            await usersTarifsStore.adminSetRank(m4Acc, 10)
            await usersTarifsStore.adminSetRank(m5Acc, 10)

            await buyTarif(maxParentTarif(), uAcc)
            await span49h()
            const bal = await makeBalancer()
            await referal.takeComsa(uAcc)
            await bal.append()

            const { ext2 } = bal.diff()

            assert.equal(ext2.m1Acc.B, 162.33)
            assert.equal(ext2.m2Acc.B, 97.4)
            assert.equal(ext2.m3Acc.B, 64.93)
            assert.equal(ext2.m4Acc.B, 51.94)
            assert.equal(ext2.m5Acc.B, 51.94)
        }
    })

    it("Buy pTarif (from none)", async function () {
        const { uAcc, m1Acc, usersTarifsStore, usersTree, referal } = await init();

        await usersTree.adminSetMentor(uAcc, m1Acc)
        await usersTarifsStore.adminSetCTarif(uAcc, maxClientTarif().pack())
        await usersTarifsStore.adminSetPTarif(uAcc, 0, 1)

        {
            const dif = await diffBalance(buyTarif(partnerTarifs[0], uAcc))
            assert.equal(dif.uAcc.B, -120)
            assert.equal(dif.finance.B, 120)
            const usage = await getUsage(uAcc)
            assert.deepEqual(usage, { freeSlots: 10, freeLVSlots: 0, level: 1, filled: 0 })
        }

        {
            const dif = await diffBalance(usersTarifsStore.reject({ from: uAcc }))
            assert.equal(dif.uAcc.B, 120)
            assert.equal(dif.finance.B, -120)
            const usage = await getUsage(uAcc)
            assert.deepEqual(usage, { freeSlots: 0, freeLVSlots: 0, level: 1, filled: 0 })
        }
    })

    it("Buy pTarif (was incorrect level)", async function () {
        const { uAcc, m1Acc, usersTarifsStore, usersTree, referal } = await init();

        await usersTree.adminSetMentor(uAcc, m1Acc)
        await usersTarifsStore.adminSetCTarif(uAcc, maxClientTarif().pack())
        await usersTarifsStore.adminSetPTarif(uAcc, 0, 100)

        {
            const dif = await diffBalance(buyTarif(partnerTarifs[0], uAcc))
            assert.equal(dif.uAcc.B, -120)
            assert.equal(dif.finance.B, 120)
            const usage = await getUsage(uAcc)
            assert.deepEqual(usage, { freeSlots: 10, freeLVSlots: 0, level: 1, filled: 0 })
        }

        {
            const dif = await diffBalance(usersTarifsStore.reject({ from: uAcc }))
            assert.equal(dif.uAcc.B, 120)
            assert.equal(dif.finance.B, -120)
            const usage = await getUsage(uAcc)
            assert.deepEqual(usage, { freeSlots: 0, freeLVSlots: 0, level: 100, filled: 0 })
        }
    })


    it("Buy pTarif (was dead lower level)", async function () {
        const { uAcc, m1Acc, usersTarifsStore, usersTree, referal } = await init();

        await usersTree.adminSetMentor(uAcc, m1Acc)
        await usersTarifsStore.adminSetPTarif(uAcc, partnerTarifs[0].pack(), 100)
        await span366d()
        // console.log(await usersTarifsStore.isPartnerTarifActive(uAcc))
        await usersTarifsStore.adminSetCTarif(uAcc, maxClientTarif().pack())

        {
            const dif = await diffBalance(buyTarif(partnerTarifs[1], uAcc))
            assert.equal(dif.uAcc.B, -350)
            assert.equal(dif.finance.B, 350)
            const usage = await getUsage(uAcc)
            assert.deepEqual(usage, { freeSlots: 20, freeLVSlots: 0, level: 1, filled: 0 })
        }

        {
            const dif = await diffBalance(usersTarifsStore.reject({ from: uAcc }))
            assert.equal(dif.uAcc.B, 350)
            assert.equal(dif.finance.B, -350)
            const usage = await getUsage(uAcc)
            assert.deepEqual(usage, { freeSlots: 1000, freeLVSlots: 0, level: 100, filled: 0 })
        }
    })

    it("Buy pTarif (was dead upper level)", async function () {
        const { uAcc, m1Acc, usersTarifsStore, usersTree, referal } = await init();

        await usersTree.adminSetMentor(uAcc, m1Acc)
        await usersTarifsStore.adminSetPTarif(uAcc, partnerTarifs[2].pack(), 100)
        await span366d()
        await usersTarifsStore.adminSetCTarif(uAcc, maxClientTarif().pack())

        {
            const dif = await diffBalance(buyTarif(partnerTarifs[1], uAcc))
            assert.equal(dif.uAcc.B, -350)
            assert.equal(dif.finance.B, 350)
            const usage = await getUsage(uAcc)
            assert.deepEqual(usage, { freeSlots: 20, freeLVSlots: 0, level: 1, filled: 0 })
        }

        {
            const dif = await diffBalance(usersTarifsStore.reject({ from: uAcc }))
            assert.equal(dif.uAcc.B, 350)
            assert.equal(dif.finance.B, -350)
            const usage = await getUsage(uAcc)
            assert.deepEqual(usage, { freeSlots: 4000, freeLVSlots: 4000, level: 100, filled: 0 })

        }
    })

    it("Buy pTarif (was alive not/filled lower)", async function () {
        const { uAcc, m1Acc, usersTarifsStore, usersTree, referal } = await init();

        await usersTree.adminSetMentor(uAcc, m1Acc)
        await usersTarifsStore.adminSetCTarif(uAcc, maxClientTarif().pack())
        await usersTarifsStore.adminSetPTarif(uAcc, partnerTarifs[0].pack(), 100)

        await mustFail(buyTarif(partnerTarifs[1], uAcc))
        await usersTarifsStore.setUsage(uAcc, 0, 0, 100);

        {
            const dif = await diffBalance(buyTarif(partnerTarifs[1], uAcc))
            assert.equal(dif.uAcc.B, -23000)
            assert.equal(dif.finance.B, 23000)
            const usage = await getUsage(uAcc)
            assert.deepEqual(usage, { freeSlots: 2000, freeLVSlots: 0, level: 100, filled: 0 })
        }

        {
            const dif = await diffBalance(usersTarifsStore.reject({ from: uAcc }))
            assert.equal(dif.uAcc.B, 23000)
            assert.equal(dif.finance.B, -23000)
            const usage = await getUsage(uAcc)
            assert.deepEqual(usage, { freeSlots: 0, freeLVSlots: 0, level: 100, filled: 100 })
        }
    })


    it("Buy pTarif (was alive not/filled the same)", async function () {
        const { uAcc, m1Acc, usersTarifsStore, usersTree, referal } = await init();

        await usersTree.adminSetMentor(uAcc, m1Acc)
        await usersTarifsStore.adminSetCTarif(uAcc, maxClientTarif().pack())
        await usersTarifsStore.adminSetPTarif(uAcc, partnerTarifs[1].pack(), 100)

        await mustFail(buyTarif(partnerTarifs[1], uAcc))
        await usersTarifsStore.setUsage(uAcc, 0, 0, 100);

        {
            const dif = await diffBalance(buyTarif(partnerTarifs[1], uAcc))
            assert.equal(dif.uAcc.B, -350)
            assert.equal(dif.finance.B, 350)
            const usage = await getUsage(uAcc)
            assert.deepEqual(usage, { freeSlots: 20, freeLVSlots: 0, level: 101, filled: 0 })
        }

        {
            const dif = await diffBalance(usersTarifsStore.reject({ from: uAcc }))
            assert.equal(dif.uAcc.B, 350)
            assert.equal(dif.finance.B, -350)
            const usage = await getUsage(uAcc)
            assert.deepEqual(usage, { freeSlots: 0, freeLVSlots: 0, level: 100, filled: 100 })
        }
    })

    it("Buy pTarif (was alive filled upper)", async function () {
        const { uAcc, m1Acc, usersTarifsStore, usersTree, referal } = await init();

        await usersTree.adminSetMentor(uAcc, m1Acc)
        await usersTarifsStore.adminSetCTarif(uAcc, maxClientTarif().pack())
        await usersTarifsStore.adminSetPTarif(uAcc, partnerTarifs[2].pack(), 100)

        await mustFail(buyTarif(partnerTarifs[1], uAcc))

        await usersTarifsStore.setUsage(uAcc, 0, 0, 100);
        await mustFail(buyTarif(partnerTarifs[1], uAcc))
    })

    it("Check extend tarif price is ok, rollback and comsa ok", async function () {
        // Build net cli->rank10->rank0->rank10
        const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, usersTarifsStore, usersTree, referal, usersFinance } = await init();

        await usersTree.adminSetMentor(uAcc, m1Acc)

        await usersTarifsStore.adminSetCTarif(uAcc, maxClientTarif().pack())
        await usersTarifsStore.adminSetCTarif(m1Acc, maxClientTarif().pack())

        await usersTarifsStore.adminSetPTarif(uAcc, partnerTarifs[0].pack(), 1)
        await usersTarifsStore.adminSetPTarif(m1Acc, maxParentTarif().pack(), 1)
        span49h()

        {
            await usersTarifsStore.adminSetPTarif(uAcc, 0, 1)

            await usersTarifsStore.adminSetRank(uAcc, 10)
            await usersTarifsStore.adminSetRank(m1Acc, 10)
            await usersTarifsStore.setUsage(uAcc, 0, 0, 100);

            const bal = await makeBalancer()
            await buyTarif(partnerTarifs[0], uAcc)
            await bal.append()

            const { ext2 } = bal.diff()
            // console.log(ext2)

            assert.equal(ext2.finance.B, 120)
        }

        {
            const bal = await makeBalancer()
            await usersTarifsStore.reject({ from: uAcc })
            await bal.append()

            const { ext2 } = bal.diff()
            assert.equal(ext2.uAcc.B, 120)
            // console.log(ext2)
        }

        {
            await usersTarifsStore.adminSetPTarif(uAcc, 0, 1)

            await usersTarifsStore.adminSetRank(uAcc, 10)
            await usersTarifsStore.adminSetRank(m1Acc, 10)
            await usersTarifsStore.setUsage(uAcc, 0, 0, 100);

            const bal = await makeBalancer()
            await buyTarif(partnerTarifs[0], uAcc)
            await bal.append()

            const { ext2 } = bal.diff()
            // console.log(ext2)

            assert.equal(ext2.finance.B, 120)
        }

        {
            const bal = await makeBalancer()
            await usersTarifsStore.reject({ from: uAcc })
            await bal.append()

            const { ext2 } = bal.diff()
            assert.equal(ext2.uAcc.B, 120)
            // console.log(ext2)
        }


        {
            await usersTarifsStore.adminSetPTarif(uAcc, partnerTarifs[0].pack(), 10)

            await usersTarifsStore.adminSetRank(uAcc, 10)
            await usersTarifsStore.adminSetRank(m1Acc, 10)
            await usersTarifsStore.setUsage(uAcc, 0, 0, 100);

            const bal = await makeBalancer()
            await buyTarif(partnerTarifs[0], uAcc)
            await bal.append()

            const { ext2 } = bal.diff()
            // console.log(ext2)

            assert.equal(ext2.finance.B, 120)
        }

        {
            const bal = await makeBalancer()
            await usersTarifsStore.reject({ from: uAcc })
            await bal.append()

            const { ext2 } = bal.diff()
            assert.equal(ext2.uAcc.B, 120)
            // console.log(ext2)
        }
    })
}