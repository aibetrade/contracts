const { partnerTarifs, clientTarifs } = require("./utils-conf");
const { buyTarif, toErc20, register } = require("./utils-finance");
const { init, mustFail } = require("./utils-system");

module.exports = () => {
    // Check can buy partner tarif
    it("Can not buy partner tarif (not max client tarif)", async function () {
        await mustFail(buyTarif(partnerTarifs[0]))
    })

    it("Can NOT register (not max client tarif)", async function () {
        const { referal, erc20, accounts } = await init();

        const regPrice = await referal.registerPrice();
        await erc20.approve(referal.address, await toErc20(regPrice, erc20));
        await mustFail(referal.regitsterPartner())
    })

    // Buy client tarif
    it("Buy lowest client tarif", async function () {
        const { uAcc } = await init();
        await buyTarif(clientTarifs[0], uAcc)
    })

    // Buy client tarif
    it("Can buy maximum client tarif", async function () {
        const { uAcc, usersTarifsStore } = await init();
        const ct = clientTarifs[clientTarifs.length - 1]

        const no = await usersTarifsStore.hasActiveMaxClientTarif(uAcc)
        assert.deepEqual(no, false)

        await buyTarif(ct, uAcc)

        const yes = await usersTarifsStore.hasActiveMaxClientTarif(uAcc)
        assert.deepEqual(yes, true)
    })

    it("Can NOT buy partner tarif without registration (after 48h)", async function () {
        const { uAcc } = await init();
        const pt = partnerTarifs[0]

        await mustFail(buyTarif(pt, uAcc))
    })

    it("Can Register when max client tarif", async function () {
        const {uAcc, usersTarifsStore} = await init();

        assert.deepEqual(await usersTarifsStore.isPartnerTarifActive(uAcc), false)
        
        await register(uAcc)

        assert.deepEqual(await usersTarifsStore.isPartnerTarifActive(uAcc), false)
    })

    it("Can NOT Register twice", async function () {
        const {uAcc} = await init();
        for (let i = 0; i < 10; i++)
            await mustFail(register(uAcc))
    })
}