const { partnerTarifs, clientTarifs } = require("./utils-conf");
const { makeBalancer, buyTarif, diffBalance } = require("./utils-finance");
const { init, span49h, mustFail, span366d } = require("./utils-system");
const { maxClientTarif, maxParentTarif, getUsage } = require("./utils-tarifs");

module.exports = () => {
   
    it("Set ctarif", async function () {
        const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, referal, usersFinance, usersTree, usersTarifsStore } = await init();
        
        const rec = await usersTarifsStore.cTarifs(uAcc)
 
        rec.tarif = 12345
        rec.boughtAt = 123456
        rec.endsAt = 1234567
        rec.gotInviteBonus = true
        await usersTarifsStore.adminSetCTarif(uAcc, compress(rec))

        const rec3 = await usersTarifsStore.cTarifs(uAcc)
        assert.deepEqual(compress(rec3), compress(rec))
    })

    it("Set ptarif", async function () {
        const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, referal, usersFinance, usersTree, usersTarifsStore } = await init();
        
        const rec = await usersTarifsStore.pTarifs(uAcc)

        rec.tarif = 12345
        rec.boughtAt = 123456
        rec.endsAt = 1234567
        rec.gotInviteBonus = true
        await usersTarifsStore.adminSetPTarif(uAcc, compress(rec))

        const rec3 = await usersTarifsStore.pTarifs(uAcc)
        assert.deepEqual(compress(rec3), compress(rec))
    })    

    it("Set usage", async function () {
        const { uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc, referal, usersFinance, usersTree, usersTarifsStore } = await init();

        const rec = await usersTarifsStore.usage(uAcc)

        rec.freeSlots = 100
        rec.freeLVSlots = 200
        rec.level = 300
        rec.filled = 400
        await usersTarifsStore.setUsage(uAcc, compress(rec))

        const rec3 = await usersTarifsStore.usage(uAcc)
        assert.deepEqual(compress(rec3), compress(rec))
    })
}