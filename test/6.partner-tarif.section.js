const { TarifData } = require("../utils/tarif");
const { buyTarif, makeBalancer } = require("./utils-finance");
const { init, mustFail, span49h, span31d, } = require("./utils-system");
const { partnerTarifs, userHasPTarif, maxClientTarif, getUsage } = require("./utils-tarifs");

module.exports = () => {
    it("Can buy any partner tarif (at start)", async function () {
        const { uAcc, usersFinance, usersTarifsStore } = await init();
        await userHasPTarif(TarifData.create())

        const bal = await makeBalancer()
        await buyTarif(partnerTarifs[1], uAcc)
        await bal.append()

        const diff = bal.diff()
        
        assert.equal(diff.bals[usersFinance.address], partnerTarifs[1].price, "Did not take money from user")
        assert.equal(diff.bals[uAcc], -partnerTarifs[1].price, "Did not freeze money")
    })

    it("Can NOT buy same or another partner tarif before fill", async function () {
        const { uAcc } = await init();
        // Cannot buy partner tarif more than 0 lvl
        // await span49h();
        for (let i = 0; i < partnerTarifs.length; i++)
            await mustFail(buyTarif(partnerTarifs[i], uAcc))
    })

    it("Can NOT buy next partner tarif only after 48h", async function () {
        const { uAcc, usersTarifsStore } = await init();
        await usersTarifsStore.adminSetFilled(uAcc);

        await mustFail(buyTarif(partnerTarifs[0], uAcc))
        await mustFail(buyTarif(partnerTarifs[1], uAcc))
        await mustFail(buyTarif(partnerTarifs[2], uAcc))
        await mustFail(buyTarif(partnerTarifs[3], uAcc))
    })

    it("Can buy same OR better tarif after fill and 48h", async function () {
        const { uAcc, usersTree, usersTarifsStore, usersFinance, referal } = await init();

        await span49h();
        await usersTarifsStore.adminSetFilled(uAcc);        
        await mustFail(buyTarif(partnerTarifs[0], uAcc))
        
        await span49h();
        await usersTarifsStore.adminSetFilled(uAcc);
        await buyTarif(partnerTarifs[1], uAcc)

        await span49h();
        await usersTarifsStore.adminSetFilled(uAcc);
        await buyTarif(partnerTarifs[2], uAcc)

        await span49h();
        await usersTarifsStore.adminSetFilled(uAcc);
        await buyTarif(partnerTarifs[3], uAcc)
    })

    it("Can NOT buy partner tarif if Max cli elapsed", async function () {
        const { uAcc, usersTarifsStore } = await init();

        await span31d();
        await usersTarifsStore.adminSetFilled(uAcc);
        await mustFail(buyTarif(partnerTarifs[3], uAcc))
        
        await buyTarif(maxClientTarif(), uAcc)

        await buyTarif(partnerTarifs[3], uAcc)
    })

    // it("Can buy partner tarif after client", async function () {
    //     const { uAcc, usersTarifsStore } = await init();

    //     await buyTarif(maxClientTarif(), uAcc)
    //     await usersTarifsStore.adminSetFilled(uAcc);
    //     await mustFail(buyTarif(partnerTarifs[3], uAcc))
        
    //     await buyTarif(maxClientTarif(), uAcc)

    //     await buyTarif(partnerTarifs[3], uAcc)
    // })    
}