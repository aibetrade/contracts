const { init } = require("./utils-system");

module.exports = () => {
	it("Created succefully", async function () {
		const { referal, accounts } = await init();

		console.log(referal.address, accounts)
	})

	// Check can buy partner tarif
	it("Get user test", async function () {
		const { referal, usersTarifsStore, uAcc } = await init();
		const ucTarif = await usersTarifsStore.cTarifs(uAcc);
		assert.equal(ucTarif.tarif, 0)
		assert.equal(ucTarif.boughtAt, 0)

		const upTarif = await usersTarifsStore.pTarifs(uAcc);
		assert.equal(upTarif.tarif, 0)
		assert.equal(upTarif.boughtAt, 0)

		const usage = await usersTarifsStore.usage(uAcc);
		assert.equal(usage.freeSlots, 0)
		assert.equal(usage.freeLVSlots, 0)
		assert.equal(usage.level, 0)
		assert.equal(usage.filled, 0)
	})
}