const { buyTarif } = require("./utils-finance");
const { init, oneAddress, zeroAddress, mustFail } = require("./utils-system");
const { clientTarifs } = require("./utils-tarifs");

module.exports = () => {
    it("Can not buy tarif without mentor", async function () {
        const { uAcc } = await init();
        for (let tarif of clientTarifs)
            await mustFail(buyTarif(tarif, uAcc))
    })

    it("Can NOT set self, zero or non-registered mentor", async function () {
        const { usersTree, uAcc, m1Acc } = await init();
        await mustFail(usersTree.setMentor(zeroAddress, { from: uAcc }))
        await mustFail(usersTree.setMentor(uAcc, { from: uAcc }))
        await mustFail(usersTree.setMentor(m1Acc, { from: uAcc }))
    })

    it("Can set mentor 0x1", async function () {
        const { usersTree, m5Acc } = await init();
        await usersTree.setMentor(oneAddress, { from: m5Acc })

        const mentor = await usersTree.getMentor(m5Acc)
        assert.equal(mentor.toString(), oneAddress);
    })

    it("User Can NOT change mentor", async function () {
        const { usersTree, m5Acc, m4Acc } = await init();

        await usersTree.setMentor(oneAddress, { from: m4Acc })
        await mustFail(usersTree.setMentor(m4Acc, { from: m5Acc }))
    })

    it("Admin can change mentor", async function () {
        const { usersTree, m5Acc, m4Acc } = await init();

        await usersTree.adminSetMentor(m4Acc, zeroAddress)
        await usersTree.adminSetMentor(m5Acc, zeroAddress)

        {
            const mentor = await usersTree.getMentor(m4Acc)
            assert.equal(mentor.toString(), zeroAddress);
        }

        {
            const mentor = await usersTree.getMentor(m5Acc)
            assert.equal(mentor.toString(), zeroAddress);
        }
    })
}