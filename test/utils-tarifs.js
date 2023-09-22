const { TarifData } = require("../utils/tarif")

const tarifsConf = require('../migrations/tarifs.json')
const { init } = require("./utils-system")

const allTarifs = tarifsConf.tarifs.map(({data}) => TarifData.fromObject(data))
const clientTarifs = allTarifs.filter(x => !x.isPartner())
const partnerTarifs = allTarifs.filter(x => x.isPartner())

function rankKey(rank, level){
    return rank << 8 | level
}

let allRanks = []
for (let i = 0; i < tarifsConf.ranks.length; i++){
    const rr = tarifsConf.ranks[i].values.map((x, j) => ({key: rankKey(i + 1, j + 1), value: x, name: tarifsConf.ranks[i].name}))
    allRanks = [...allRanks, ...rr]
}

const inviteBonusHash = tarifsConf.matrix

function maxClientTarif() {
    return clientTarifs[clientTarifs.length - 1];
}

async function setCTarifs(tarifs, from) {
    const { cliTarifs } = await init();
    const tarifs2 = tarifs.map(x => x.pack())
    await (from ? cliTarifs.setAll(tarifs2, { from }) : cliTarifs.setAll(tarifs2))
}

async function setPTarifs(tarifs, from) {
    const { parTarifs } = await init();

    const tarifs2 = tarifs.map(x => x.pack())
    await (from ? parTarifs.setAll(tarifs2, { from }) : parTarifs.setAll(tarifs2))
}

async function setMatrix(matrix) {
    const { referal } = await init();

    const key = (pk, ck) => (pk << 16) | ck;

    const keys = matrix.map(x => key(x[0], x[1]))
    const percs = matrix.map(x => x[2])

    await referal.setInviteMatrix(keys, percs)
}

async function userHasCTarif(ctarif, acc = null) {
    const { referal, usersTarifsStore, accounts } = await init();

    acc = acc || accounts[0]

    const ucTarif = await usersTarifsStore.cTarifs(acc)
    assert.deepEqual(ctarif, TarifData.fromPack(ucTarif.tarif))
}

async function userHasPTarif(ptarif, acc = null) {
    const { referal, usersTarifsStore, accounts } = await init();

    acc = acc || accounts[0]

    const upTarif = await usersTarifsStore.pTarifs(acc)
    assert.deepEqual(ptarif, TarifData.fromPack(upTarif.tarif))
}

async function getUsage(acc) {
    const { usersTarifsStore } = await init();
    const usage = await usersTarifsStore.usage(acc)
    return Object.keys(usage).filter(x => isNaN(x)).reduce((s, c) => ({ ...s, [c]: Number(usage[c]) }), {})
}

async function getRollback(acc) {
    const { usersTarifsStore } = await init();
    const uRollback = await usersTarifsStore.rollbacks(acc)

    return {...uRollback, 
        usage: Object.keys(uRollback.usage).filter(x => isNaN(x)).reduce((s, c) => ({ ...s, [c]: Number(uRollback.usage[c]) }), {})
    }
}




module.exports = {
    // tarifs,
    clientTarifs, 
    partnerTarifs, 
    inviteBonusHash,
    allRanks,

    maxClientTarif,
    setCTarifs,
    setPTarifs,
    setMatrix,

    userHasCTarif,
    userHasPTarif,
    
    getUsage,
    getRollback
}