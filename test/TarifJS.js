const { TarifData, TarifUsage } = require('../utils/tarif')

contract("TarifData", function (/* accounts */) {
  it("Packed without errors any number of params", async function () {
    // Less params
    TarifData.create(10).pack()

    // Normal params
    TarifData.create(10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 1)

    // More params
    TarifData.create(10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140)
  });

  it("Unpacked equal to packed", async function () {
    const src = TarifData.create(10, 20, 30, 40)
    const packed = src.pack();
    const unpacked = TarifData.fromPack(packed)

    assert.deepEqual(src, unpacked)
  });
});