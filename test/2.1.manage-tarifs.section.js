const { TarifData } = require("../utils/tarif");
const { clientTarifs, partnerTarifs, inviteBonusHash } = require("./utils-conf");
// const { inviteBonusHash } = require("./tarifs-data");
const { init, mustFail } = require("./utils-system");
const { setCTarifs, setPTarifs, setMatrix } = require("./utils-tarifs");

module.exports = () => {
    it("All accounts have access to contract", async function () {
        const { accounts, cliTarifs, parTarifs } = await init();

        for (let acc of accounts) {
            await cliTarifs.getAll({ from: acc })
            await parTarifs.getAll({ from: acc })
        }
    })

    it("Only OWNER can add and remove tarifs", async function () {
        const { accounts } = await init();

        await setCTarifs(clientTarifs)

        for (let acc of accounts.slice(1)) {
            await mustFail(setCTarifs(clientTarifs, acc))
            await mustFail(setPTarifs(partnerTarifs, acc))
        }
    })

    it("Client tarfis added correctly", async function () {
        const { cliTarifs } = await init();

        await setCTarifs(clientTarifs)

        {
            // get all cliet tarifs at one time
            const allClientTarifs = await cliTarifs.getAll();
            assert.deepEqual(allClientTarifs.length, clientTarifs.length)

            for (let i = 0; i < clientTarifs.length; i++) {
                const bcTarif = TarifData.fromPack(allClientTarifs[i])
                assert.deepEqual(bcTarif, clientTarifs[i])

                const exists = await cliTarifs.exists(clientTarifs[i].key)
                assert.equal(exists, true)
            }

            for (let i = 0; i < partnerTarifs.length; i++) {
                const exists = await cliTarifs.exists(partnerTarifs[i].key)
                assert.equal(exists, false)
            }
        }
    })

    it("Partner tarfis added correctly", async function () {
        const { referal, parTarifs } = await init();

        await setPTarifs(partnerTarifs)

        {
            // get all cliet tarifs at one time
            const allTarifs = await parTarifs.getAll();
            assert.deepEqual(allTarifs.length, partnerTarifs.length)

            for (let i = 0; i < partnerTarifs.length; i++) {
                const bcTarif = TarifData.fromPack(allTarifs[i])
                assert.deepEqual(bcTarif, partnerTarifs[i])

                const exists = await parTarifs.exists(partnerTarifs[i].key)
                assert.equal(exists, true)
            }

            for (let i = 0; i < clientTarifs.length; i++) {
                const exists = await parTarifs.exists(clientTarifs[i].key)
                assert.equal(exists, false)
            }
        }
    })

    it("Set tarif matrix", async function () {
        const { referal } = await init();

        await setMatrix(inviteBonusHash)

        // Check percs
        for (let [pk, ck, p] of inviteBonusHash) {
            assert.equal(p, Number(await referal.getInvitePercent(pk, ck)))
        }
    })
}