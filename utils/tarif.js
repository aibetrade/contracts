const KEYS = ["key", "price", "numSlots", "comsa", "hasCompess", "numLVSlots", "LV", "fullNum"]

class TarifData {
    static fromObject(obj) {
        const tarif = TarifData.create(0, 0, 0, 0, 0, 0, 0, 0)
        Object.assign(tarif, obj)
        return tarif
    }

    static create(...args) {
        const tarif = new TarifData()
        const input = KEYS.reduce((s, c, i) => ({...s, [c]: args[i] || 0}), {} )
        Object.assign(tarif, input)
        return tarif
    }

    static fromPack(pack) {
        pack = BigInt(pack)
        const values = []
        for (let i = 0; i < KEYS.length; i++) {
            values.push(Number(pack & 0xFFFFn));
            pack = pack >> 16n
        }
        return TarifData.create(...values);
    }

    pack() {
        const fields = KEYS.map(x => this[x] || 0) // reduce((s, c, i) => ({...s, [c]: args[i] || 0}), {} )
        let place = 0n
        let pack = 0n;
        for (let f of fields) {
            pack = pack | ((f ? BigInt(f) : 0n) << place);
            place += 16n
        }

        return pack;
    }

    isPartner() {
        return this.numSlots > 0;
    }
}

module.exports = { TarifData }