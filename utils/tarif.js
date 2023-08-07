
class TarifData {
    static create(
        price,
        invitePercent,
        numSlots,
        comsa,
        hasCompess,
        numLVSlots,
        maxLVComsa,
        LV,
    ) {
        const tarif = new TarifData()

        const input = {
            price,
            invitePercent,
            numSlots,
            comsa,
            hasCompess,
            numLVSlots,
            maxLVComsa,
            LV
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
        for (let i = 0; i < 8; i++) {
            values.push(Number(pack & 0xFFFFn));
            pack = pack >> 16n
        }
        return TarifData.create(...values);
    }

    pack() {
        const fields = [
            this.price,
            this.invitePercent,
            this.numSlots,
            this.comsa,
            this.hasCompess,
            this.numLVSlots,
            this.maxLVComsa,
            this.LV
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
    static create(usedSlots, usedLVSlots, extLevel) {
        const tarif = new TarifUsage()

        const input = { usedSlots, usedLVSlots, extLevel }

        for (let k of Object.keys(input)) {
            input[k] = input[k] || 0
        }

        Object.assign(tarif, input)
        return tarif
    }

    static fromPack(pack) {
        pack = BigInt(pack)
        const values = []
        for (let i = 0; i < 4; i++) {
            values.push(Number(pack & 0xFFFFn));
            pack = pack >> 16n
        }
        return TarifUsage.create(...values);
    }

    pack() {
        const fields = [this.usedSlots, this.usedLVSlots, this.extLevel]

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