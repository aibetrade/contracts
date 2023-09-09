const { TarifData } = require("../utils/tarif");
const { init, clientTarifs, partnerTarifs, mustFail } = require("./utils");

module.exports = () => {
    it("All accounts have access to contract", async function () {
        const { accounts, cliTarifs, parTarifs } = await init();

        for (let acc of accounts) {
            await cliTarifs.getAll({ from: acc })
            await parTarifs.getAll({ from: acc })
        }
    })

    it("Only OWNER can add and remove tarifs", async function () {
        const { referal, UsersTarifsStore, accounts, cliTarifs, parTarifs } = await init();

        await cliTarifs.append(clientTarifs[0].pack())
        await cliTarifs.clear()

        for (let acc of accounts.slice(1)) {
            await mustFail(cliTarifs.append(clientTarifs[0].pack(), { from: acc }))
            await mustFail(cliTarifs.clear({ from: acc }))
            await mustFail(parTarifs.append(partnerTarifs[0].pack(), { from: acc }))
            await mustFail(parTarifs.clear({ from: acc }))
        }
    })

    it("Client tarfis added correctly", async function () {
        const { referal, cliTarifs } = await init();

        await cliTarifs.clear()
        for (let tarif of clientTarifs) {
            await cliTarifs.append(tarif.pack())
        }

        {
            // get all cliet tarifs at one time
            const allclientTarifs = await cliTarifs.getAll();
            assert.deepEqual(allclientTarifs.length, clientTarifs.length)

            for (let i = 0; i < clientTarifs.length; i++) {
                const bcTarif = TarifData.fromPack(allclientTarifs[i])
                assert.deepEqual(bcTarif, clientTarifs[i])

                const exists = await cliTarifs.exists(clientTarifs[i].pack())
                assert.equal(exists, true)
            }

            for (let i = 0; i < partnerTarifs.length; i++) {
                const exists = await cliTarifs.exists(partnerTarifs[i].pack())
                assert.equal(exists, false)
            }
        }
    })

    it("Partner tarfis added correctly", async function () {
        const { referal, parTarifs } = await init();

        await parTarifs.clear()
        for (let tarif of partnerTarifs) {
            await parTarifs.append(tarif.pack())
        }

        {
            // get all cliet tarifs at one time
            const allTarifs = await parTarifs.getAll();
            assert.deepEqual(allTarifs.length, partnerTarifs.length)

            for (let i = 0; i < partnerTarifs.length; i++) {
                const bcTarif = TarifData.fromPack(allTarifs[i])
                assert.deepEqual(bcTarif, partnerTarifs[i])

                const exists = await parTarifs.exists(partnerTarifs[i].pack())
                assert.equal(exists, true)
            }

            for (let i = 0; i < clientTarifs.length; i++) {
                const exists = await parTarifs.exists(clientTarifs[i].pack())
                assert.equal(exists, false)
            }
        }
    })

    // it("Tarif price is correct", async function () {
    //   const { referal } = await init();

    //   for (let i = 0; i < tarifs.length; i++) {
    //     const price = await referal.getPrice(tarifs[i].pack())
    //     assert.equal(price.toNumber(), tarifs[i].price)
    //   }
    // });

}