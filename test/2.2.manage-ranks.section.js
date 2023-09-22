const { TarifData } = require("../utils/tarif");
// const { inviteBonusHash } = require("./tarifs-data");
const { init, mustFail } = require("./utils-system");
const { setCTarifs, setPTarifs, clientTarifs, partnerTarifs, setMatrix, inviteBonusHash, allRanks } = require("./utils-tarifs");

module.exports = () => {
    it("Tokey/fromKey is ok", async function () {
        const { accounts, rankMatrix } = await init();

        for(let rr of allRanks){
            const fk = await rankMatrix.fromKey(rr.key)
            const tk = await rankMatrix.toKey(fk._rank, fk._level)
            assert.equal(rr.key, Number(tk))
        }
    })

    it("Rank matrix filled correct after migration", async function () {
        const { rankMatrix } = await init();

        const ranks = [...allRanks.reduce((s, c) => s.add(c.key >> 8 & 0xFF), new Set())]
        const levels = [...allRanks.reduce((s, c) => s.add(c.key & 0xFF), new Set())        ]

        assert.equal(Number(await rankMatrix.maxRank()), ranks.length)
        assert.equal(Number(await rankMatrix.maxLevel()), levels.length)

        for(let rr of allRanks){
            const value = await rankMatrix.matrix(rr.key)
            assert.equal(value, rr.value)
        }
    })

    it("Only OWNERS can set ranks", async function () {
        const { accounts, rankMatrix } = await init();

        for (let acc of accounts.slice(1)) {
            await mustFail(rankMatrix.setMatrix(allRanks.map(x => x.key), allRanks.map(x => x.value), { from: acc }))
        }

        await rankMatrix.setMatrix(allRanks.map(x => x.key), allRanks.map(x => x.value))
    })

    it("Rank matrix filled correct", async function () {
        const { rankMatrix } = await init();

        const ranks = [...allRanks.reduce((s, c) => s.add(c.key >> 8 & 0xFF), new Set())]
        const levels = [...allRanks.reduce((s, c) => s.add(c.key & 0xFF), new Set())        ]

        assert.equal(Number(await rankMatrix.maxRank()), ranks.length)
        assert.equal(Number(await rankMatrix.maxLevel()), levels.length)

        for(let rr of allRanks){
            const value = await rankMatrix.matrix(rr.key)
            assert.equal(value, rr.value)
        }
    })
}