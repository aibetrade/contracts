const { init, clientTarifs, oneAddress, buyTarif } = require("./utils");

module.exports = () => {
    it("Can buy client tarif with money and mentor", async function () {
        const { usersTree, uAcc } = await init();

        await usersTree.setMentor(oneAddress, { from: uAcc })
        await buyTarif(clientTarifs[0], uAcc)
    })

    it("Can buy another client tarif", async function () {
        const { uAcc } = await init();
        for (let tarif of clientTarifs) {
            await buyTarif(tarif, uAcc)
        }
    })
}