const Referal = artifacts.require("ReferalPartner");
const ERC20Token = artifacts.require("ERC20Token");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */

const zeroAddress = '0x0000000000000000000000000000000000000000';

const { TarifData, TarifUsage } = require('../utils/tarif')

// + Create contract
// + Append tarifs
// * Freeze tarifs

const clientTarifs = [
  TarifData.create(10, 10),
  TarifData.create(25, 15),
  TarifData.create(50, 20),
]

const partnerTarifs = [
  TarifData.create(150, 10, 15, 2),
  TarifData.create(350, 15, 25, 3),
  TarifData.create(700, 20, 50, 4, 1, 50, 4, 1),
  TarifData.create(1500, 25, 100, 5, 1, 100, 5, 3),
]

const tarifs = [...clientTarifs, ...partnerTarifs]

async function init() {
  const referal = await Referal.deployed();
  const erc20 = await ERC20Token.deployed();
  const accounts = await web3.eth.getAccounts()

  const bene = accounts[9]

  return { erc20, referal, accounts, bene, C0: accounts[0], C1: accounts[1], C2: accounts[2] }
}

async function failed(prom) {
  try {
    await prom
  }
  catch (ex) {
    return true
  }
  throw "Must fail"
}


async function userHasCTarif(ctarif, acc = null) {
  const { erc20, referal, accounts } = await init();

  acc = acc || accounts[0]

  const user = await referal.getUser(acc)
  assert.deepEqual(ctarif, TarifData.fromPack(user.clientTarif))
}

async function userHasPTarif(ptarif, acc = null) {
  const { erc20, referal, accounts } = await init();

  acc = acc || accounts[0]

  const user = await referal.getUser(acc)
  assert.deepEqual(ptarif, TarifData.fromPack(user.partnerTarif))
}

async function buyTarif(tarif, acc = null) {
  const { erc20, referal, accounts } = await init();
  acc = acc || accounts[0]

  await erc20.approve(referal.address, await toErc20(tarif.price, erc20), { from: acc });
  await referal.buyTarif(tarif.pack(), { from: acc })

  if (tarif.isPartner())
    await userHasPTarif(tarif, acc)
  else
    await userHasCTarif(tarif, acc)
}

async function toErc20(num, erc20) {
  const decimals = await erc20.decimals();
  return BigInt((10 ** Number(decimals)) * Number(num));
}


contract("Referal-Tarif", function (/* accounts */) {
  it("Created succefully", async function () {
    await init();
    accounts = await web3.eth.getAccounts()
  })

  it("All accounts have access to contract", async function () {
    const { referal } = await init();

    for (let acc of accounts) {
      await referal.getClientTarifs({ from: acc })
    }
  })

  it("Tarfis added correctly", async function () {
    const { referal } = await init();

    for (let tarif of tarifs) {
      await referal.addTarif(tarif.pack())
    }

    {
      // get all cliet tarifs at one time
      const allClientTarifs = await referal.getClientTarifs();
      assert.deepEqual(allClientTarifs.length, clientTarifs.length)

      for (let i = 0; i < clientTarifs.length; i++) {
        const bcTarif = allClientTarifs[i]
        const ut = TarifData.fromPack(bcTarif)
        assert.deepEqual(ut, clientTarifs[i])
      }
    }

    {
      // get all cliet tarifs at one time
      const allTarifs = await referal.getPartnerTarifs();
      assert.deepEqual(allTarifs.length, partnerTarifs.length)

      for (let i = 0; i < partnerTarifs.length; i++) {
        const bcTarif = allTarifs[i]
        const ut = TarifData.fromPack(bcTarif)
        assert.deepEqual(ut, partnerTarifs[i])
      }
    }

    // Checl tarifs hash
    {
      // get all cliet tarifs at one time
      for (let i = 0; i < tarifs.length; i++) {
        const bt = await referal.tarifsHash(tarifs[i].pack())
        assert.deepEqual(bt, true)
      }
    }

  })

  it("Test tarifs existance", async () => {
    const { referal } = await init();

    for (let i = 0; i < tarifs.length; i++) {
      const exists = await referal.tarifsHash(tarifs[i].pack())
      assert.equal(exists, true)
    }

    {
      const exists = await referal.tarifsHash(TarifData.create(10, 122).pack())
      assert.equal(exists, false)
    }
  })

  it("Tarif price is correct", async function () {
    const { referal } = await init();

    for (let i = 0; i < tarifs.length; i++) {
      const price = await referal.getPrice(tarifs[i].pack())
      assert.equal(price.toNumber(), tarifs[i].price)
    }
  });

  it("MaxClietnPrice is OK", async function () {
    const { referal } = await init();

    const maxClientPrice = await referal.maxClientPrice()
    assert.equal(maxClientPrice.toNumber(), clientTarifs[clientTarifs.length - 1].price)
  });

  // Check can buy partner tarif
  it("Get user test", async function () {
    const { referal } = await init();
    const user = await referal.getUser(accounts[0]);
    assert.equal(user.clientTarifAt, 0)
    assert.equal(user.partnerTarifAt, 0)
  })

  it("Can not buy tarif without money", async function () {
    const { referal } = await init();
    await failed(referal.buyTarif(tarifs[0].pack()))
  })

  it("Can not buy tarif without mentor", async function () {
    await failed(buyTarif(tarifs[0]))
  })

  it("Can NOT set mentor which is not a registered member", async function () {
    const { referal, accounts } = await init();
    await failed(referal.setMentor(accounts[1], { from: accounts[1] }))
  })

  it("Mentor set is OK", async function () {
    const { referal, accounts } = await init();
    await referal.setMentor(accounts[9])
  })

  it("Can NOT change mentor", async function () {
    const { referal, accounts } = await init();
    await failed(referal.setMentor(accounts[9]))
  })

  it("Can buy client tarif with money and mentor", async function () {
    const { referal, erc20 } = await init();

    await buyTarif(tarifs[0])

    assert.equal(await referal.hasMaxClientTarif(accounts[0]), false);
  })

  it("Can buy another client tarif with money and mentor", async function () {
    const { referal, erc20 } = await init();

    const userBefore = await referal.getUser(accounts[0])
    const ctBefore = TarifData.fromPack(userBefore.clientTarif)
    assert.deepEqual(ctBefore, tarifs[0])

    await buyTarif(tarifs[1])

    const user = await referal.getUser(accounts[0])
    const ct = TarifData.fromPack(user.clientTarif)
    assert.deepEqual(ct, tarifs[1])
  })

  // Check can buy partner tarif
  it("Can not buy partner tarif (not max client tarif)", async function () {
    await failed(buyTarif(partnerTarifs[0]))
  })

  it("Can NOT register (not max client tarif)", async function () {
    const { referal, erc20, accounts } = await init();

    const regPrice = await toErc20(await referal.registerPrice(), erc20);
    await erc20.approve(referal.address, await toErc20(regPrice, erc20));
    await failed(referal.RegitsterPartner())
  })

  // Buy client tarif
  it("Can buy maximum client tarif", async function () {
    const { referal, erc20, accounts } = await init();
    const ct = clientTarifs[clientTarifs.length - 1]

    const no = await referal.hasMaxClientTarif(accounts[0])
    assert.deepEqual(no, false)

    await buyTarif(ct)

    const yes = await referal.hasMaxClientTarif(accounts[0])
    assert.deepEqual(yes, true)
  })

  it("Can NOT buy partner tarif without registration", async function () {
    const { referal, erc20, accounts } = await init();
    const pt = partnerTarifs[0]

    await failed(buyTarif(pt))
  })

  it("Can Register when max client tarif", async function () {
    const { referal, erc20, accounts } = await init();
    const regPrice = await referal.registerPrice();
    await erc20.approve(referal.address, await toErc20(regPrice, erc20));
    await referal.RegitsterPartner()
  })

  it("Can buy ONLY first partner tarif (at start)", async function () {
    const { referal, erc20, accounts } = await init();

    await userHasPTarif(TarifData.create())

    // Cannot buy partner tarif more than 0 lvl
    for (let i = 1; i < partnerTarifs.length; i++)
      await failed(buyTarif(partnerTarifs[i]))

    await buyTarif(partnerTarifs[0])
  })

  it("Can NOT buy same or another partner tarif", async function () {
    // Cannot buy partner tarif more than 0 lvl
    for (let i = 0; i < partnerTarifs.length; i++)
      await failed(buyTarif(partnerTarifs[i]))
  })

  it("Can NOT extend or upgrade not filled tarif", async function () {
    const { referal, erc20, accounts } = await init();

    await erc20.approve(referal.address, await toErc20(10000, erc20));

    await failed(referal.extendTarif())
    await failed(referal.upgradeTarif())
  })


  // --- "Referal-Money-Client"
  it("C1 registered under C0", async function () {
    const { referal, erc20, accounts } = await init();

    {
      const user = await referal.getUser(accounts[1])
      assert.deepEqual(user.mentor, zeroAddress)
    }

    await referal.setMentor(accounts[0], { from: accounts[1] })

    {
      const user = await referal.getUser(accounts[1])
      assert.deepEqual(user.mentor, accounts[0])
    }
  })

  it("C0 transfer 100 to C1", async function () {
    const { referal, erc20, C1 } = await init();
    const uBalanceBefore = await erc20.balanceOf(accounts[1])

    await erc20.transfer(C1, await toErc20(1000, erc20));
    const uBalanceAfter = await erc20.balanceOf(accounts[1])

    assert.equal((uBalanceAfter - uBalanceBefore) / (10**8), 1000)
  })

  it("C1 buy client tarif (check user logic)", async function () {
    const { referal, erc20, accounts, bene } = await init();

    const user = await referal.getUser(accounts[1])
    console.log(user)

    {
      const tarif = clientTarifs[0]

      const uBalanceBefore = await erc20.balanceOf(accounts[1])
      const bBalanceBefore = await erc20.balanceOf(bene)
      const mBalanceBefore = await erc20.balanceOf(user.mentor)

      await buyTarif(tarif, accounts[1])

      const uBalanceAfter = await erc20.balanceOf(accounts[1])
      const bBalanceAfter = await erc20.balanceOf(bene)
      const mBalanceAfter = await erc20.balanceOf(user.mentor)

      const mpTarif = await referal.getUser(user.mentor)
      const comsa = TarifData.fromPack(mpTarif.partnerTarif).comsa
      console.log({comsa})

      console.log(mBalanceAfter.toString(), mBalanceBefore.toString())
      console.log(mBalanceAfter.sub(mBalanceBefore).toNumber()/ (10**8))

      assert.equal((uBalanceAfter - uBalanceBefore) / (10**8), -tarif.price)
      // assert.equal((BigInt(mBalanceAfter).minus(mBalanceBefore) / (10**8), tarif.price * (tarif.invitePercent + 5) / 100 + comsa)
      // assert.equal((uBalanceAfter - uBalanceBefore) / (10**8), 1000)

      console.log('DIFF USER', uBalanceAfter.sub(uBalanceBefore) / (10**8))
      console.log('DIFF BENE', mBalanceAfter.sub(mBalanceBefore) / (10**8))
      console.log('DIFF MENO', bBalanceAfter.sub(bBalanceBefore) / (10**8))
    }

    // const { referal, erc20, accounts } = await init();

    // const aa = await referal.getPartnerTarifs();
    // console.log('aaaaaaaaaaaaaaa', aa, accounts[1])



    // const ss = await referal.getPartnerTarifs({from: accounts[1]});
    // console.log('sssssssssssssssssss', ss)

    // const ss = await referal.partnerTarifs(0, { from: accounts[1] });
    // console.log('sssssssssssssssssss', ss)


    // const hh = await referal.tarifsHash(tarif.pack(), {from: accounts[1]});
    // console.log('hhhhhhhhhhhh', hh)


    // await userHasCTarif(TarifData.create(), accounts[1])
    // await buyTarif(clientTarifs[0], accounts[1])
    // await userHasCTarif(clientTarifs[0], accounts[1])

    // Check money cheme
  })
})




// Check user tarif active

// Buy partner tarif
// Check can extend tarif (not filled)
// Check can upgrade tarif (not filled)

// Buy client (check percent scheme)
// Buy partner (check percent scheme)

// Check can extend tarif (filled)
// Check can upgrade tarif (filled)
