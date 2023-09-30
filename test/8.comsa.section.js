const { TarifData } = require("../utils/tarif");
const { partnerTarifs, clientTarifs } = require("./utils-conf");
const { buyTarif, makeBalancer } = require("./utils-finance");
const { init, span49h } = require("./utils-system");
const { userHasPTarif, maxClientTarif } = require("./utils-tarifs");


module.exports = () => {
    it("Check comsa taken after Buy client", async function () {
        const { uAcc, usersFinance } = await init();

        const bal = await makeBalancer()

        await buyTarif(maxClientTarif(), uAcc)

        await bal.append()

        assert.equal(await usersFinance.comsaExists(uAcc), false)
    })

    it("Check comsa taken after Buy partner (and pushing)", async function () {
        const { uAcc, usersFinance, usersTree, usersTarifsStore } = await init();

        const bal = await makeBalancer()

        await usersTarifsStore.adminSetPTarif(uAcc, TarifData.create().pack(), 1)
        await userHasPTarif(TarifData.create())

        await buyTarif(partnerTarifs[0], uAcc)
        await span49h();
        await usersTarifsStore.adminSetFilled(uAcc);
        await bal.append()
        assert.equal(bal.diff().company, 0)

        for (let i = 0; i < 3; i++) {
            await buyTarif(partnerTarifs[0], uAcc)
            await span49h();
            await usersTarifsStore.adminSetFilled(uAcc);
            await bal.append()
            {
                const diff = bal.diff()

                assert.equal(diff.company, partnerTarifs[0].price * 0.3)
                assert.equal(diff.quartc, partnerTarifs[0].price * 0.05)
                assert.equal(diff.magic, partnerTarifs[0].price * 0.65)
            }
            assert.equal(await usersFinance.comsaExists(uAcc), true)
        }
    })

    it("Comsa ok if Buy Client after Partner", async function () {
        const { uAcc, usersFinance, usersTarifsStore } = await init();

        const bal = await makeBalancer()

        await buyTarif(partnerTarifs[0], uAcc)
        await span49h();
        await usersTarifsStore.adminSetFilled(uAcc);
        await bal.append()
        {
            const diff = bal.diff()
            assert.equal(diff.company, partnerTarifs[0].price * 0.3)
            assert.equal(diff.quartc, partnerTarifs[0].price * 0.05)
            assert.equal(diff.magic, partnerTarifs[0].price * 0.65)
        }
        assert.equal(await usersFinance.comsaExists(uAcc), true)

        await buyTarif(clientTarifs[0], uAcc)
        await bal.append()
        {
            const diff = bal.diff()
            assert.equal(diff.company, partnerTarifs[0].price * 0.3 + clientTarifs[0].price * 0.3)
            assert.equal(diff.quartc, partnerTarifs[0].price * 0.05 + clientTarifs[0].price * 0.05)
            assert.equal(diff.magic, partnerTarifs[0].price * 0.65 + clientTarifs[0].price * 0.65)
        }
        assert.equal(await usersFinance.comsaExists(uAcc), false)
    })

    it("Comsa disabled after rejection", async function () {
        const { uAcc, referal, usersFinance, usersTarifsStore } = await init();

        await buyTarif(maxClientTarif(), uAcc)

        const bal = await makeBalancer()
        assert.equal(await usersFinance.comsaExists(uAcc), false)
        
        await buyTarif(partnerTarifs[0], uAcc)
        assert.equal(await usersFinance.comsaExists(uAcc), true)

        await usersTarifsStore.reject({from: uAcc})
        assert.equal(await usersFinance.comsaExists(uAcc), false)
    })

    it("Manual take comsa is ok", async function () {
        const { uAcc, referal, usersFinance } = await init();

        await buyTarif(partnerTarifs[0], uAcc)
        span49h()
        assert.equal(await usersFinance.comsaExists(uAcc), true)
        assert.equal(await referal.canTakeComsa(uAcc), true)

        const bal = await makeBalancer()

        await referal.takeComsa(uAcc)
        await bal.append()
        {
            const diff = bal.diff()
            assert.equal(diff.company, partnerTarifs[0].price * 0.3)
            assert.equal(diff.quartc, partnerTarifs[0].price * 0.05)
            assert.equal(diff.magic, partnerTarifs[0].price * 0.65)
        }
        assert.equal(await usersFinance.comsaExists(uAcc), false)
    })
}