const { TarifData } = require("../utils/tarif")

const clientTarifs = [
    TarifData.create(101, 10),
    TarifData.create(102, 30),
    TarifData.create(103, 50),
]

const partnerTarifs = [
    // TarifData.create(10000 + 1, 150, 10, 15, 2, 0, 0, 0, 5),
    // TarifData.create(10000 + 2, 350, 15, 25, 3, 0, 0, 0, 10),
    // TarifData.create(10000 + 3, 700, 20, 50, 4, 1, 50, 2, 20),
    // TarifData.create(10000 + 4, 1500, 25, 100, 5, 1, 100, 4, 40),

    // TarifData.create(10000 + 1, 120, 2, 1, 2, 0, 0, 0, 5),
    // TarifData.create(10000 + 2, 350, 3, 2, 3, 0, 0, 0, 10),
    // TarifData.create(10000 + 3, 699, 4, 3, 4, 1, 50, 2, 20),
    // TarifData.create(10000 + 4, 999, 5, 4, 5, 1, 100, 4, 40),

    TarifData.create(10000 + 1, 120, 2, 1, 2, 0, 0, 0, 2),
    TarifData.create(10000 + 2, 350, 3, 2, 3, 0, 0, 0, 2),
    TarifData.create(10000 + 3, 699, 4, 3, 4, 1, 50, 2, 2),
    TarifData.create(10000 + 4, 999, 5, 4, 5, 1, 100, 4, 2)
]

const inviteBonusHash = [
    [partnerTarifs[0].pack(), clientTarifs[0].pack(), 10],
    [partnerTarifs[0].pack(), clientTarifs[1].pack(), 10],
    [partnerTarifs[0].pack(), clientTarifs[2].pack(), 10],
    [partnerTarifs[0].pack(), partnerTarifs[0].pack(), 10],
    [partnerTarifs[0].pack(), partnerTarifs[1].pack(), 10],
    [partnerTarifs[0].pack(), partnerTarifs[2].pack(), 10],
    [partnerTarifs[0].pack(), partnerTarifs[3].pack(), 10],

    [partnerTarifs[1].pack(), clientTarifs[0].pack(), 10],
    [partnerTarifs[1].pack(), clientTarifs[1].pack(), 12],
    [partnerTarifs[1].pack(), clientTarifs[2].pack(), 12],
    [partnerTarifs[1].pack(), partnerTarifs[0].pack(), 10],
    [partnerTarifs[1].pack(), partnerTarifs[1].pack(), 12],
    [partnerTarifs[1].pack(), partnerTarifs[2].pack(), 12],
    [partnerTarifs[1].pack(), partnerTarifs[3].pack(), 15],

    [partnerTarifs[2].pack(), clientTarifs[0].pack(), 10],
    [partnerTarifs[2].pack(), clientTarifs[1].pack(), 12],
    [partnerTarifs[2].pack(), clientTarifs[2].pack(), 15],
    [partnerTarifs[2].pack(), partnerTarifs[0].pack(), 10],
    [partnerTarifs[2].pack(), partnerTarifs[1].pack(), 12],
    [partnerTarifs[2].pack(), partnerTarifs[2].pack(), 15],
    [partnerTarifs[2].pack(), partnerTarifs[3].pack(), 20],

    [partnerTarifs[3].pack(), clientTarifs[0].pack(), 10],
    [partnerTarifs[3].pack(), clientTarifs[1].pack(), 15],
    [partnerTarifs[3].pack(), clientTarifs[2].pack(), 20],
    [partnerTarifs[3].pack(), partnerTarifs[0].pack(), 10],
    [partnerTarifs[3].pack(), partnerTarifs[1].pack(), 15],
    [partnerTarifs[3].pack(), partnerTarifs[2].pack(), 20],
    [partnerTarifs[3].pack(), partnerTarifs[3].pack(), 25],
]

module.exports = {
    clientTarifs, partnerTarifs, inviteBonusHash
}