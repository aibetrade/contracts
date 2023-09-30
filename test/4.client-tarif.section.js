const { init, oneAddress } = require("./utils-system");
const { buyTarif } = require("./utils-finance");
const { clientTarifs } = require("./utils-conf");

module.exports = () => {
    it("Can buy client tarif with money and mentor", async function () {
        const { usersTree, usersFinance, uAcc } = await init();

        await usersTree.setMentor(oneAddress, { from: uAcc })

        assert.equal(await usersFinance.comsaExists(uAcc), false)
        await buyTarif(clientTarifs[0], uAcc)
        assert.equal(await usersFinance.comsaExists(uAcc), false)
    })

    it("Can buy another client tarif", async function () {
        const { uAcc, usersFinance } = await init();
        for (let tarif of clientTarifs) {
            assert.equal(await usersFinance.comsaExists(uAcc), false)
            await buyTarif(tarif, uAcc)
            assert.equal(await usersFinance.comsaExists(uAcc), false)
        }
    })
}