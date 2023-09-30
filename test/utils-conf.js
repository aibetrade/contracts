const { TarifData } = require("../utils/tarif")
const tarifsConf = require('../migrations/conf/tarifs.json')

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

module.exports = {
    clientTarifs, 
    partnerTarifs, 
    inviteBonusHash,
    allRanks    
}