const { TarifData } = require("../utils/tarif");
const { clientTarifs, partnerTarifs } = require("./utils-conf");
const { init } = require("./utils-system")

function maxClientTarif() {
    return clientTarifs[clientTarifs.length - 1];
}

function maxParentTarif() {
    return partnerTarifs[partnerTarifs.length - 1];
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
    maxClientTarif,
    maxParentTarif,
    
    setCTarifs,
    setPTarifs,
    setMatrix,

    userHasCTarif,
    userHasPTarif,
    
    getUsage,
    getRollback
}