
class TarifData {
    static create(
        key,
        price,
        invitePercent,
        numSlots,
        comsa,
        hasCompess,
        numLVSlots,
        LV,
        fullNum,
        isRejected,
        isComsaTaken,
    ) {
        const tarif = new TarifData()

        const input = {
            key,
            price,
            invitePercent,
            numSlots,
            comsa,
            hasCompess,
            numLVSlots,
            LV,
            fullNum,
            isRejected,
            isComsaTaken,    
        }

        for (let k of Object.keys(input)) {
            input[k] = input[k] || 0
        }

        Object.assign(tarif, input)
        return tarif
    }

    static fromPack(pack) {
        pack = BigInt(pack)
        const values = []
        for (let i = 0; i < 16; i++) {
            values.push(Number(pack & 0xFFFFn));
            pack = pack >> 16n
        }
        return TarifData.create(...values);
    }

    pack() {
        const fields = [
            this.key,
            this.price,
            this.invitePercent,
            this.numSlots,
            this.comsa,
            this.hasCompess,
            this.numLVSlots,
            this.LV,
            this.fullNum,
            this.isRejected,
            this.isComsaTaken    
        ]

        let place = 0n
        let pack = 0n;
        for (let f of fields) {
            pack = pack | ((f ? BigInt(f) : 0n) << place);
            place += 16n
        }

        return pack;
    }

    isPartner(){
        return this.numSlots > 0;
    }
}


class TarifUsage {
    static create(usedSlots, usedLVSlots, extLevel, filled) {
        const tarif = new TarifUsage()

        const input = { usedSlots, usedLVSlots, extLevel, filled }

        for (let k of Object.keys(input)) {
            input[k] = input[k] || 0
        }

        Object.assign(tarif, input)
        return tarif
    }

    static fromPack(pack) {
        pack = BigInt(pack)
        const values = []
        for (let i = 0; i < 5; i++) {
            values.push(Number(pack & 0xFFFFn));
            pack = pack >> 16n
        }
        return TarifUsage.create(...values);
    }

    pack() {
        const fields = [this.usedSlots, this.usedLVSlots, this.extLevel, this.filled]

        let place = 0n
        let pack = 0n;
        for (let f of fields) {
            pack = pack | ((f ? BigInt(f) : 0n) << place);
            place += 16n
        }

        return pack;
    }
}

module.exports = { TarifData, TarifUsage }