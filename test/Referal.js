// const zeroAddress = '0x0000000000000000000000000000000000000000';
// const REGISTRATION_KEY = 65535;

const { TarifData, TarifUsage } = require('../utils/tarif');

const { clientTarifs, partnerTarifs, inviteBonusHash } = require('./tarifs-data')
const tarifs = [...clientTarifs, ...partnerTarifs]

// const { tarifs, clientTarifs, partnerTarifs } = require('./utils')
const { mustFail, init, span49h, toErc20, buyTarif, maxClientTarif, makeBalancer, zeroAddress, oneAddress } = require('./utils')

contract("Referal-Tarif", function (/* accounts */) {
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

	// it("Can not buy client tarif without money", async function () {
	//   await mustFail(buyTarif(tarifs[0]))
	// })

	require('./manage-tarifs.section')()
	require('./mentor.section')()
	require('./give-usdt.section')()
	// require('./client-tarif.section')()
	// require('./register.section')()
	// require('./partner-tarif.section')()

	require('./reject.section')()

	// it("Can buy any partner tarif (at start)", async function () {
	// 	await init();
	// 	await span49h();
	// 	await userHasPTarif(TarifData.create())
	// 	await buyTarif(partnerTarifs[1])
	// })

	// it("Can NOT buy same or another partner tarif before fill", async function () {
	// 	// Cannot buy partner tarif more than 0 lvl
	// 	await span49h();
	// 	for (let i = 0; i < partnerTarifs.length; i++)
	// 		await mustFail(buyTarif(partnerTarifs[i]))
	// })

	return

	// --- Rejection tests
	it("Can buy client tarif and reject if <48h", async function () {
		const { referal, UsersTarifsStore, accounts, erc20 } = await init();

		// console.log(await getLastBuy(accounts[0]))

		for (let tarif of clientTarifs) {
			const uBalanceBefore = await erc20.balanceOf(accounts[0])
			await buyTarif(tarif)

			const uBalanceAfterBuy = await erc20.balanceOf(accounts[0])
			const lastBuyBefore = await getLastBuy(accounts[0])

			await referal.reject()

			const uBalanceAfterReject = await erc20.balanceOf(accounts[0])

			// Last tarif in history not changed (only rejected)
			const lastBuy = await getLastBuy(accounts[0])

			const lastBuyTarifBefore = TarifData.fromPack(lastBuyBefore.tarif)
			lastBuyTarifBefore.isRejected = 1
			// last tarif after reject = last tarif before reject | rejected==1
			assert.deepEqual(lastBuyTarifBefore.pack().toString(), lastBuy.tarif.toString()); //  keyAfterBuy, keyAfterReject);

			// And balances backed as was
			assert.deepEqual(uBalanceBefore.sub(uBalanceAfterBuy).toNumber() / (10 ** 8), tarif.price)
			assert.deepEqual(uBalanceAfterReject.sub(uBalanceAfterBuy).toNumber() / (10 ** 8), tarif.price)
			assert.deepEqual(uBalanceBefore.sub(uBalanceAfterReject).toNumber() / (10 ** 8), 0)
		}
	})

	it("Can not reject twice", async function () {
		const { referal } = await init();

		await buyTarif(clientTarifs[0])

		await referal.reject()
		await mustFail(referal.reject())
		await mustFail(referal.reject())
		await mustFail(referal.reject())
	})


	// --- C1 section

	it("giev 10000USDT to C1, C2, C3, C4, C5", async function () {
		const { erc20, C1, C2, C3, C4, C5, C6 } = await init();

		await erc20.transfer(C1, await toErc20(10000))
		await erc20.transfer(C2, await toErc20(10000))
		await erc20.transfer(C3, await toErc20(10000))
		await erc20.transfer(C4, await toErc20(10000))
		await erc20.transfer(C5, await toErc20(10000))
		await erc20.transfer(C6, await toErc20(10000))
	})

	it("C1 buy max ctarif, register, ptarif-0", async function () {
		const { referal, UsersTarifsStore, C1, cWallet } = await init();

		await UsersTarifsStore.setMentor(cWallet, { from: C1 })

		await buyTarif(maxClientTarif(), C1)
		await span49h();

		await register(C1);
		await span49h();

		await buyTarif(partnerTarifs[0], C1)
		await span49h();
	})

	it("C1 is mentor of c2", async function () {
		const { referal, UsersTarifsStore, C1, C2 } = await init();

		await UsersTarifsStore.setMentor(C1, { from: C2 })
		const user = await UsersTarifsStore.users(C2)
		assert.deepEqual(user.mentor, C1)
	})

	it("define InviteMatrix", async function () {
		const { referal, C1, C2 } = await init();

		for (let rec of inviteBonusHash) {
			// console.log(TarifData.fromPack(rec[0]).key, TarifData.fromPack(rec[1]).key, rec[2])
			await referal.setInvitePercent(rec[0], rec[1], rec[2]);
		}

		for (let rec of inviteBonusHash) {
			// console.log(TarifData.fromPack(rec[0]).key, TarifData.fromPack(rec[1]).key, rec[2], Number(await referal.getInvitePercent(rec[0], rec[1])))
			assert.deepEqual(Number(await referal.getInvitePercent(rec[0], rec[1])), rec[2]);
		}
	})

	it("get all comissions of Company (root partners)", async function () {
		const { referal, C1, cWallet, erc20 } = await init();

		await span49h();

		const comsasBefore = await getAllComsasOf(cWallet);
		const unusedComsasBefore = comsasBefore.filter(x => !x.isRejected && !x.isComsaTaken)
		const cBalanceBefore = await erc20.balanceOf(cWallet)

		let sum = 0;
		for (let com of unusedComsasBefore) {
			sum += com.price
			await referal.takeComsa(com.client, com.index)
		}

		const cBalanceAfter = await erc20.balanceOf(cWallet)
		assert.deepEqual(sum, await fromErc20(cBalanceAfter.sub(cBalanceBefore)))
	})

	it("C2 buy ctarif then C1 getComission", async function () {
		const { referal, erc20, C1, C2, cWallet, qWallet, mWallet } = await init();

		await buyTarif(clientTarifs[0], C2)
		await mustFail(referal.takeComsa(C2, 0))
		await span49h();

		// Get all comsas
		const comsasBefore = await getAllComsasOf(C1);
		const unusedComsasBefore = comsasBefore.filter(x => !x.isRejected && !x.isComsaTaken)

		const bals = await makeBalancer()

		await referal.takeComsa(unusedComsasBefore[0].client, unusedComsasBefore[0].index)

		await bals.append('After')

		const comsasAfter = await getAllComsasOf(C1);
		const unusedComsasAfter = comsasAfter.filter(x => !x.isRejected && !x.isComsaTaken)

		assert.deepEqual(unusedComsasAfter.length, unusedComsasBefore.length - 1)

		bals.print()
	})

	async function getUserInfo(acc = null) {
		const { referal, UsersTarifsStore, accounts } = await init();
		acc = acc || accounts[0]

		const active = await UsersTarifsStore.isPartnerActive(acc)
		const cTarifInfo = await UsersTarifsStore.cTarifs(acc)

		const pTarifInfo = await UsersTarifsStore.pTarifs(acc)

		const pTarifUsageInfo = (await UsersTarifsStore.users(acc)).partnerTarifUsage
		const pTarifUsage = TarifUsage.fromPack(pTarifUsageInfo)

		const hasSlot = await UsersTarifsStore.hasSlot(acc)
		const hasLVSlot = await UsersTarifsStore.hasLVSlot(acc)

		// cTarifInfo.tarif = TarifData.fromPack(cTarifInfo.tarif)
		// pTarifInfo.tarif = TarifData.fromPack(pTarifInfo.tarif)

		return {
			acc,
			active,
			cTarifRaw: cTarifInfo.tarif,
			cTarifInfo: {
				tarif: TarifData.fromPack(cTarifInfo.tarif),
				boughtAt: Number(cTarifInfo.boughtAt),
				gotInviteBonus: cTarifInfo.gotInviteBonus
			},
			pTarifRaw: pTarifInfo.tarif,
			pTarifInfo: {
				tarif: TarifData.fromPack(pTarifInfo.tarif),
				boughtAt: Number(pTarifInfo.boughtAt),
				gotInviteBonus: pTarifInfo.gotInviteBonus

			},
			pTarifUsage,
			hasSlot,
			hasLVSlot,
		}
	}

	async function buildTreeUp(acc = null) {
		const { referal, UsersTarifsStore, accounts } = await init();
		acc = acc || accounts[0]

		const tree = []

		const cWallet = await referal.cWallet()

		for (let i = 0; i < 16; i++) {
			if (acc == zeroAddress || acc == cWallet) break;
			const info = await getUserInfo(acc);
			tree.push(info)


			acc = (await UsersTarifsStore.users(acc)).mentor
		}
		return tree
	}

	async function processUserFirstComsa(acc = null) {
		const { referal, UsersTarifsStore, accounts } = await init();
		acc = acc || accounts[0]

		const buyHistory = (await prettyHistory(acc)).filter(x => !x.isComsaTaken && !x.isRejected)
		const lastComsaRec = buyHistory[0]
		if (!lastComsaRec) return;

		const tar = TarifData.fromPack(lastComsaRec.tarif)
		// const gotInviteBonus = (await (tar.isPartner() ? referal.pTarifs(acc) : referal.cTarifs(acc))).gotInviteBonus

		const tree = await buildTreeUp(acc)

		const mentor = (await UsersTarifsStore.users(acc)).mentor
		// console.log(tree)
		// return

		const uInfoBefore = await getUserInfo(acc)
		const mInfoBefore = await getUserInfo(mentor)
		const bals = await makeBalancer()

		await referal.takeComsa(acc, lastComsaRec.index)

		const uInfoAfter = await getUserInfo(acc)
		const mInfoAfter = await getUserInfo(mentor)

		// Check slots
		if (mInfoBefore.hasSlot) {
			if (mInfoAfter.pTarifUsage.usedSlots - mInfoBefore.pTarifUsage.usedSlots != 1) throw "usedSlots error"
		} else {
			if (mInfoAfter.pTarifUsage.usedSlots - mInfoBefore.pTarifUsage.usedSlots != 0) throw "usedSlots error"
		}

		let m1Comsa = 0

		{
			const tarifData = tar.isPartner() ? uInfoBefore.pTarifInfo : uInfoBefore.cTarifInfo;
			// console.log(tarifData.gotInviteBonus)

			if (!tarifData.gotInviteBonus)
				m1Comsa += getInviteBonus(mInfoBefore.pTarifInfo.tarif, uInfoAfter.cTarifInfo.tarif) * tar.price / 100
		}


		// console.log(m1Comsa)

		// console.log(await Promise.all(tree.map(x => referal.getLV(x.pTarifRaw))))

		// console.log(tree.map(x => x.pTarifInfo.tarif.numLVSlots))
		// console.log(tree.map(x => x.pTarifInfo.tarif.LV))
		// console.log(tree.map(x => x.pTarifUsage))

		// Calc top comsas

		// Check mentor comsa

		// Check lv slots



		await bals.append("after")
		// console.log(bals.diff2('after', 'init'))

		// console.log('uinfo', uInfoBefore, uInfoAfter)
		// console.log('minfo', mInfoBefore, mInfoAfter)

		const d = bals.diff('after', 'init')
		const { price, count } = lastComsaRec
		const sumPayed = price * count

		assert.deepEqual(sumPayed * 30 / 100, d.company)
		assert.deepEqual(sumPayed * 5 / 100, d.quart)

		// console.log(bals.diff2('after', 'init'))

		// let mentorCom = 0
		// if (!gotInviteBonus){
		//   const m1PTarif = await referal.pTarifs[m1Acc].tarif
		//   const ip = inviteMatrix[m1PTarif, hrec.tarif]
		//   mentorCom += sum * ip / 100
		// }
	}

	it("build chan C1->C2->C3->C4->C5 + register", async function () {
		const { referal, UsersTarifsStore, erc20, C1, C2, C3, C4, C5 } = await init();


		const uAcc = C5;
		const m1Acc = C4;
		const m2Acc = C3;
		const m3Acc = C2;
		const m4Acc = C1;

		// await referal.setMentor(C1, { from: C2 })
		await UsersTarifsStore.setMentor(m1Acc, { from: uAcc })
		await UsersTarifsStore.setMentor(m2Acc, { from: m1Acc })
		await UsersTarifsStore.setMentor(m3Acc, { from: m2Acc })
		// await referal.setMentor(m4Acc, { from: m3Acc })    

		await buyTarif(maxClientTarif(), uAcc)
		await buyTarif(maxClientTarif(), m1Acc)
		await buyTarif(maxClientTarif(), m2Acc)
		await buyTarif(maxClientTarif(), m3Acc)
		await buyTarif(maxClientTarif(), m4Acc)
		await span49h();

		await register(m1Acc)
		await register(m2Acc)
		await register(m3Acc)
		await span49h();
	})

	it("All buy partner tarifs", async function () {
		const { referal, erc20, C1, C2, C3, C4, C5 } = await init();

		const uAcc = C5;
		const m1Acc = C4;
		const m2Acc = C3;
		const m3Acc = C2;
		const m4Acc = C1;

		await buyTarif(partnerTarifs[0], m1Acc)
		await buyTarif(partnerTarifs[2], m2Acc)
		await buyTarif(partnerTarifs[3], m3Acc)
		await span49h();
	})

	// it("Take comsa (slot free)", async function () {
	//   const { referal, erc20, uAcc, m1Acc } = await init();

	//   const ui1Before = await getUserInfo(m1Acc)

	//   await buyTarif(maxClientTarif(), uAcc)
	//   await span49h();

	//   await processUserFirstComsa(uAcc)

	//   const ui1After = await getUserInfo(m1Acc)


	//   // console.log(ui1Before, ui1After)

	// })

	it("Take comsa test", async function () {
		const { referal, erc20, uAcc, m1Acc } = await init();

		for (let i = 0; i < 4; i++) {

			await buyTarif(maxClientTarif(), uAcc)
			await span49h();

			await processUserFirstComsa(uAcc)
		}
	})

	it("Can extend filled tarif", async function () {
		const { referal, erc20, uAcc, m1Acc } = await init();

		// // const tarif = TarifData.fromPack((await referal.pTarifs(m1Acc)).tarif)
		// // const usage = TarifUsage.fromPack((await referal.users(m1Acc)).partnerTarifUsage)

		// console.log({tarif, usage})

		await buyTarif(partnerTarifs[0], m1Acc);
	})

	it("Take comsa test", async function () {
		const { referal, erc20, uAcc, m1Acc } = await init();

		for (let i = 0; i < 10; i++) {

			await buyTarif(maxClientTarif(), uAcc)
			await span49h();

			await processUserFirstComsa(uAcc)
		}
	})

	it("Can upgrade filled tarif", async function () {
		const { referal, UsersTarifsStore, erc20, uAcc, m1Acc } = await init();

		await buyTarif(maxClientTarif(), m1Acc)
		await span49h();

		await buyTarif(partnerTarifs[2], m1Acc);
	})
})




// Check user tarif active

// Buy partner tarif
// Check can extend tarif (not filled)
// Check can upgrade tarif (not filled)

// Buy client (check percent scheme)
// Buy partner (check percent scheme)

// Check can extend tarif (filled)
// Check can upgrade tarif (filled)
