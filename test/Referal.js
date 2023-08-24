const Referal = artifacts.require("Referal");
const ERC20Token = artifacts.require("ERC20Token");
const TarifsContractBase = artifacts.require("TarifsContractBase");
const { time } = require('@openzeppelin/test-helpers');

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */

const zeroAddress = '0x0000000000000000000000000000000000000000';
const REGISTRATION_KEY = 65535;

const { TarifData, TarifUsage } = require('../utils/tarif');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

// + Create contract
// + Append tarifs
// * Freeze tarifs

const clientTarifs = [
  TarifData.create(133, 10, 10),
  TarifData.create(134, 25, 15),
  TarifData.create(135, 50, 20),
]

const partnerTarifs = [
  TarifData.create(10000 + 1, 150, 10, 15, 2),
  TarifData.create(10000 + 2, 350, 15, 25, 3),
  TarifData.create(10000 + 3, 700, 20, 50, 4, 1, 50, 4, 1),
  TarifData.create(10000 + 4, 1500, 25, 100, 5, 1, 100, 5, 3),
]

function maxClientTarif() {
  return clientTarifs[clientTarifs.length - 1];
}

const tarifs = [...clientTarifs, ...partnerTarifs]

let stack = null

async function init(isNew = false) {
  if (isNew || !stack) {
    const accounts = await web3.eth.getAccounts()
    const referal = await Referal.deployed()

    stack = {
      referal,
      erc20: await ERC20Token.deployed(),
      accounts,
      cliTarifs: await TarifsContractBase.at(await referal.clientTarifs()),
      parTarifs: await TarifsContractBase.at(await referal.partnerTarifs()),

      cWallet: accounts[8],
      qWallet: accounts[9],
      mWallet: accounts[7],

      C0: accounts[0],
      C1: accounts[1],
      C2: accounts[2],
      C3: accounts[3],
    }
  }

  return stack;
}

async function mustFail(prom) {
  try {
    await prom
  }
  catch (ex) {
    return true
  }
  throw "Must fail"
}

const span49h = async () => {
  // await time.increaseTo(this.openingTime);
  // await time.advanceBlock();
  await time.increase(49 * 3600);
  await time.advanceBlock();
}

async function userHasCTarif(ctarif, acc = null) {
  const { referal, accounts } = await init();

  acc = acc || accounts[0]

  const user = await referal.getUser(acc)
  assert.deepEqual(ctarif, TarifData.fromPack(user.clientTarif))
}

async function userHasPTarif(ptarif, acc = null) {
  const { referal, accounts } = await init();

  acc = acc || accounts[0]

  const user = await referal.getUser(acc)
  assert.deepEqual(ptarif, TarifData.fromPack(user.partnerTarif))
}

async function getLastBuy(acc = null) {
  const { referal, accounts } = await init();
  acc = acc || accounts[0]
  const buyHistory = await referal.getBuyHistory(acc)
  return buyHistory[buyHistory.length - 1]
}

// Get all comsas
async function getComsas(partner) {
  const { referal, C1, C2 } = await init();

  let result = []
  const refs = await referal.getReferals(partner)
  for (let ref of refs) {
    const history = await referal.getBuyHistory(ref)

    const history2 = history.map((x, i) => {
      const { timestamp, tarif, count } = x
      const tar = TarifData.fromPack(tarif)
      const { key, price, isRejected, isComsaTaken } = tar
      return { client: ref, index: i, count, price, key, isRejected, isComsaTaken, timestamp, tarif }
    })

    result = [...result, ...history2]
  }

  return result
}

async function printUserTarifs(acc = null, msg) {
  const { referal, accounts } = await init();
  acc = acc || accounts[0]
  const user = await referal.users(acc)

  console.log(msg)
  console.log(`USER=${acc}, REG(${user.registered})`)
  console.log(`Mentor=${user.mentor}`)
  console.log(`PN(${TarifData.fromPack(user.partnerTarif).key})`, user.partnerTarif.toString(), user.partnerTarifAt.toString(), user.partnerTarifUsage.toString())
  console.log(`CN(${TarifData.fromPack(user.clientTarif).key})`, user.clientTarif.toString(), user.clientTarifAt.toString())
  console.log(`RB(${TarifData.fromPack(user.rollbackTarif).key})`, user.rollbackTarif.toString(), user.rollbackDate.toString(), user.rollbackUsage.toString())
}

async function printBuyHistory(acc = null) {
  const { referal, accounts } = await init();
  acc = acc || accounts[0]

  const buyHistory = await referal.getBuyHistory(acc)

  console.log(buyHistory)
}

async function register(acc = null) {
  const { erc20, referal, accounts } = await init();
  acc = acc || accounts[0]

  const regPrice = await toErc20(await referal.registerPrice());
  await erc20.approve(referal.address, await toErc20(regPrice), { from: acc });
  return referal.regitsterPartner({ from: acc })
}

async function buyTarif(tarif, acc = null) {
  const { erc20, referal, accounts } = await init();
  acc = acc || accounts[0]

  const refBalanceBefore = await erc20.balanceOf(referal.address)

  const userWas = await referal.users(acc)

  const buyHistoryWas = await referal.getBuyHistory(acc)

  // --- Buy logic
  await erc20.approve(referal.address, await toErc20(tarif.price, erc20), { from: acc });
  if (tarif.isPartner())
    await referal.buyPartnerTarif(tarif.pack(), { from: acc })
  else
    await referal.buyClientTarif(tarif.pack(), { from: acc })


  const refBalanceAfter = await erc20.balanceOf(referal.address)
  if (await fromErc20(refBalanceAfter.sub(refBalanceBefore)) != tarif.price) throw "Income incorrect"

  // Check tarif exists
  if (tarif.isPartner())
    await userHasPTarif(tarif, acc)
  else
    await userHasCTarif(tarif, acc)

  // --- Check buy history
  const buyHistory = await referal.getBuyHistory(acc)
  if (buyHistory.length - 1 != buyHistoryWas.length) throw "Buy history not changed"

  const lastBuy = buyHistory[buyHistory.length - 1]
  if (lastBuy.tarif.toString() != tarif.pack()) throw "Last buy tarif not added to history"

  // --- Check rollback saved ok 
  const user = await referal.users(acc)

  // console.log(tarif.key, tarif.pack())
  // console.log("PW", userWas.partnerTarif.toString(), userWas.partnerTarifAt.toString(), userWas.partnerTarifUsage.toString())
  // console.log("CW", userWas.clientTarif.toString(), userWas.clientTarifAt.toString())
  // console.log("RB", user.rollbackTarif.toString(), user.rollbackDate.toString(), user.rollbackUsage.toString())
  // console.log("PN", user.partnerTarif.toString(), user.partnerTarifAt.toString(), user.partnerTarifUsage.toString())
  // console.log("CN", user.clientTarif.toString(), user.clientTarifAt.toString())

  // Check rollback info is correct
  if (tarif.isPartner()) {
    if (user.rollbackTarif.toString() != userWas.partnerTarif.toString()) throw "partnerTarif tarif not saved"
    if (user.rollbackDate.toString() != userWas.partnerTarifAt.toString()) throw "partnerTarif date not saved"
    if (user.rollbackUsage.toString() != userWas.partnerTarifUsage.toString()) throw "partnerTarif usage not saved"
  }
  else {
    if (user.rollbackTarif.toString() != userWas.clientTarif.toString()) throw "clientTarif tarif not saved"
    if (user.rollbackDate.toString() != userWas.clientTarifAt.toString()) throw "clientTarif date not saved"
  }
}

async function toErc20(dollar) {
  const { erc20 } = await init();
  const decimals = await erc20.decimals();
  return BigInt((10 ** Number(decimals)) * Number(dollar));
}

async function fromErc20(wei) {
  const { erc20 } = await init();
  const decimals = await erc20.decimals();
  return Number(BigInt(Number(wei) / (10 ** Number(decimals))));
}

contract("Referal-Tarif", function (/* accounts */) {
  it("Created succefully", async function () {
    await init();
  })

  it("All accounts have access to contract", async function () {
    const { referal, accounts } = await init();

    const cliTarifs = await TarifsContractBase.at(await referal.clientTarifs())
    const parTarifs = await TarifsContractBase.at(await referal.partnerTarifs())

    for (let acc of accounts) {
      await cliTarifs.getAll({ from: acc })
      await parTarifs.getAll({ from: acc })
    }
  })

  it("Olny OWNER can add and remove tarifs", async function () {
    const { referal, accounts } = await init();

    const cliTarifs = await TarifsContractBase.at(await referal.clientTarifs())
    const parTarifs = await TarifsContractBase.at(await referal.partnerTarifs())

    await cliTarifs.append(clientTarifs[0].pack())
    await cliTarifs.clear()

    for (let acc of accounts.slice(1)) {
      await mustFail(cliTarifs.append(clientTarifs[0].pack(), { from: acc }))
      await mustFail(cliTarifs.clear({ from: acc }))
      await mustFail(parTarifs.append(partnerTarifs[0].pack(), { from: acc }))
      await mustFail(parTarifs.clear({ from: acc }))
    }
  })

  it("Client tarfis added correctly", async function () {
    const { referal, cliTarifs } = await init();

    await cliTarifs.clear()
    for (let tarif of clientTarifs) {
      await cliTarifs.append(tarif.pack())
    }

    {
      // get all cliet tarifs at one time
      const allclientTarifs = await cliTarifs.getAll();
      assert.deepEqual(allclientTarifs.length, clientTarifs.length)

      for (let i = 0; i < clientTarifs.length; i++) {
        const bcTarif = TarifData.fromPack(allclientTarifs[i])
        assert.deepEqual(bcTarif, clientTarifs[i])

        const exists = await cliTarifs.exists(clientTarifs[i].pack())
        assert.equal(exists, true)
      }

      for (let i = 0; i < partnerTarifs.length; i++) {
        const exists = await cliTarifs.exists(partnerTarifs[i].pack())
        assert.equal(exists, false)
      }
    }
  })

  it("Parent tarfis added correctly", async function () {
    const { referal, parTarifs } = await init();

    await parTarifs.clear()
    for (let tarif of partnerTarifs) {
      await parTarifs.append(tarif.pack())
    }

    {
      // get all cliet tarifs at one time
      const allTarifs = await parTarifs.getAll();
      assert.deepEqual(allTarifs.length, partnerTarifs.length)

      for (let i = 0; i < partnerTarifs.length; i++) {
        const bcTarif = TarifData.fromPack(allTarifs[i])
        assert.deepEqual(bcTarif, partnerTarifs[i])

        const exists = await parTarifs.exists(partnerTarifs[i].pack())
        assert.equal(exists, true)
      }

      for (let i = 0; i < clientTarifs.length; i++) {
        const exists = await parTarifs.exists(clientTarifs[i].pack())
        assert.equal(exists, false)
      }
    }
  })


  it("Tarif price is correct", async function () {
    const { referal } = await init();

    for (let i = 0; i < tarifs.length; i++) {
      const price = await referal.getPrice(tarifs[i].pack())
      assert.equal(price.toNumber(), tarifs[i].price)
    }
  });

  // Check can buy partner tarif
  it("Get user test", async function () {
    const { referal, accounts } = await init();
    const user = await referal.getUser(accounts[0]);
    assert.equal(user.clientTarifAt, 0)
    assert.equal(user.partnerTarifAt, 0)
  })

  // it("Can not buy client tarif without money", async function () {
  //   await mustFail(buyTarif(tarifs[0]))
  // })

  it("Can not buy tarif without mentor", async function () {
    await mustFail(buyTarif(tarifs[0]))
  })

  // it("Can NOT set mentor which is not a registered member", async function () {
  //   const { referal, accounts } = await init();
  //   await mustFail(referal.setMentor(accounts[1], { from: accounts[1] }))
  // })

  it("Mentor set is OK", async function () {
    const { referal, cWallet } = await init();
    await referal.setMentor(cWallet)
  })

  it("Can NOT change mentor", async function () {
    const { referal, C1 } = await init();
    await mustFail(referal.setMentor(C1))
  })

  it("Can buy client tarif with money and mentor", async function () {
    const { referal, accounts } = await init();

    await buyTarif(tarifs[0])

    assert.equal(await referal.hasActiveMaxClientTarif(accounts[0]), false);
  })

  it("Can not buy another tarif till 48 hours", async function () {
    await init();
    await mustFail(buyTarif(tarifs[0]))
  })

  it("Can buy another tarif after 48 hours", async function () {
    await init();
    await span49h();
    await buyTarif(tarifs[0])
    // assert.equal(await referal.hasActiveMaxClientTarif(accounts[0]), false);
  })

  // Check can buy partner tarif
  it("Can not buy partner tarif (not max client tarif)", async function () {
    await mustFail(buyTarif(partnerTarifs[0]))
  })

  it("Can NOT register (not max client tarif)", async function () {
    const { referal, erc20, accounts } = await init();

    const regPrice = await toErc20(await referal.registerPrice(), erc20);
    await erc20.approve(referal.address, await toErc20(regPrice, erc20));
    await mustFail(referal.regitsterPartner())
  })


  // Buy client tarif
  it("Can buy maximum client tarif (after 48h)", async function () {
    const { referal, erc20, accounts } = await init();
    const ct = clientTarifs[clientTarifs.length - 1]

    await span49h();

    const no = await referal.hasActiveMaxClientTarif(accounts[0])
    assert.deepEqual(no, false)

    await buyTarif(ct)

    const yes = await referal.hasActiveMaxClientTarif(accounts[0])
    assert.deepEqual(yes, true)
  })

  it("Can NOT buy partner tarif without registration (after 48h)", async function () {
    const { referal, erc20, accounts } = await init();
    const pt = partnerTarifs[0]

    await span49h();
    await mustFail(buyTarif(pt))
  })

  it("Can Register when max client tarif", async function () {
    const { referal, erc20, accounts } = await init();
    const regPrice = await referal.registerPrice();
    await erc20.approve(referal.address, await toErc20(regPrice, erc20));
    await referal.regitsterPartner()
  })

  it("Can buy any partner tarif (at start)", async function () {
    await init();
    await span49h();
    await userHasPTarif(TarifData.create())
    await buyTarif(partnerTarifs[1])
  })

  it("Can NOT buy same or another partner tarif before fill", async function () {
    // Cannot buy partner tarif more than 0 lvl
    await span49h();
    for (let i = 0; i < partnerTarifs.length; i++)
      await mustFail(buyTarif(partnerTarifs[i]))
  })



  // --- Rejection tests
  it("Can buy client tarif and reject if <48h", async function () {
    const { referal, accounts, erc20 } = await init();

    // console.log(await getLastBuy(accounts[0]))

    for (let tarif of clientTarifs) {
      const uBalanceBefore = await erc20.balanceOf(accounts[0])
      await buyTarif(tarif)

      const uBalanceAfterBuy = await erc20.balanceOf(accounts[0])
      const lastBuyBefore = await getLastBuy(accounts[0])

      await referal.reject()

      const uBalanceAfterReject = await erc20.balanceOf(accounts[0])

      // Last tarif in history not changed (only rejected)
      const lastBuy = await getLastBuy(accounts[0])

      const lastBuyTarifBefore = TarifData.fromPack(lastBuyBefore.tarif)
      lastBuyTarifBefore.isRejected = 1
      // last tarif after reject = last tarif before reject | rejected==1
      assert.deepEqual(lastBuyTarifBefore.pack().toString(), lastBuy.tarif.toString()); //  keyAfterBuy, keyAfterReject);

      // And balances backed as was
      assert.deepEqual(uBalanceBefore.sub(uBalanceAfterBuy).toNumber() / (10 ** 8), tarif.price)
      assert.deepEqual(uBalanceAfterReject.sub(uBalanceAfterBuy).toNumber() / (10 ** 8), tarif.price)
      assert.deepEqual(uBalanceBefore.sub(uBalanceAfterReject).toNumber() / (10 ** 8), 0)
    }
  })

  it("Can not reject twice", async function () {
    const { referal } = await init();

    await buyTarif(clientTarifs[0])

    await referal.reject()
    await mustFail(referal.reject())
    await mustFail(referal.reject())
    await mustFail(referal.reject())
  })


  // --- C1 section

  it("giev 10000USDT to C1, C2, C3", async function () {
    const { erc20, C1, C2, C3 } = await init();

    await erc20.transfer(C1, await toErc20(10000))
    await erc20.transfer(C2, await toErc20(10000))
    await erc20.transfer(C3, await toErc20(10000))
  })

  it("C1 buy max ctarif, register, ptarif-0", async function () {
    const { referal, C1, cWallet } = await init();

    await referal.setMentor(cWallet, { from: C1 })

    await buyTarif(maxClientTarif(), C1)
    await span49h();

    await register(C1);
    await span49h();

    await buyTarif(partnerTarifs[0], C1)
    await span49h();
  })

  it("C1 is mentor of c2", async function () {
    const { referal, C1, C2 } = await init();

    await referal.setMentor(C1, { from: C2 })
    const user = await referal.users(C2)
    assert.deepEqual(user.mentor, C1)
  })

  it("get all comissions of Company (root partners)", async function () {
    const { referal, C1, cWallet, erc20 } = await init();

    await span49h();

    const comsasBefore = await getComsas(cWallet);
    const unusedComsasBefore = comsasBefore.filter(x => !x.isRejected && !x.isComsaTaken)
    const cBalanceBefore = await erc20.balanceOf(cWallet)

    let sum = 0;
    for (let com of unusedComsasBefore){
      sum += com.price
      await referal.takeComsa(com.client, com.index)
    }    

    const cBalanceAfter = await erc20.balanceOf(cWallet)
    assert.deepEqual(sum, await fromErc20(cBalanceAfter.sub(cBalanceBefore)))
  })

  it("C2 buy ctarif then C1 getComission", async function () {
    const { referal, C1, C2 } = await init();

    await buyTarif(clientTarifs[0], C2)
    await mustFail(referal.takeComsa(C2, 0))
    await span49h();

    // Get all comsas
    const comsasBefore = await getComsas(C1);
    const unusedComsasBefore = comsasBefore.filter(x => !x.isRejected && !x.isComsaTaken)

    // await printUserTarifs(C1, "C1")
    // await printUserTarifs(C2, "C2")
    // await printUserTarifs(unusedComsasBefore[0].client)

    await referal.takeComsa(unusedComsasBefore[0].client, unusedComsasBefore[0].index)

    const comsasAfter = await getComsas(C1);
    const unusedComsasAfter = comsasAfter.filter(x => !x.isRejected && !x.isComsaTaken)

    assert.deepEqual(unusedComsasAfter.length, unusedComsasBefore.length - 1)
  })





  return

  it("Can NOT extend or upgrade not filled tarif", async function () {
    const { referal, erc20, accounts } = await init();

    await erc20.approve(referal.address, await toErc20(10000, erc20));

    await mustFail(referal.extendTarif())
    await mustFail(referal.upgradeTarif())
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

    assert.equal((uBalanceAfter - uBalanceBefore) / (10 ** 8), 1000)
  })

  it("C1 buy client tarif (check user logic)", async function () {
    const { referal, erc20, accounts, cWallet } = await init();

    const user = await referal.getUser(accounts[1])
    console.log(user)

    {
      const tarif = clientTarifs[0]

      const uBalanceBefore = await erc20.balanceOf(accounts[1])
      const bBalanceBefore = await erc20.balanceOf(cWallet)
      const mBalanceBefore = await erc20.balanceOf(user.mentor)

      await buyTarif(tarif, accounts[1])

      const uBalanceAfter = await erc20.balanceOf(accounts[1])
      const bBalanceAfter = await erc20.balanceOf(cWallet)
      const mBalanceAfter = await erc20.balanceOf(user.mentor)

      const mpTarif = await referal.getUser(user.mentor)
      const comsa = TarifData.fromPack(mpTarif.partnerTarif).comsa
      console.log({ comsa })

      console.log(mBalanceAfter.toString(), mBalanceBefore.toString())
      console.log(mBalanceAfter.sub(mBalanceBefore).toNumber() / (10 ** 8))

      assert.equal((uBalanceAfter - uBalanceBefore) / (10 ** 8), -tarif.price)
      // assert.equal((BigInt(mBalanceAfter).minus(mBalanceBefore) / (10**8), tarif.price * (tarif.invitePercent + 5) / 100 + comsa)
      // assert.equal((uBalanceAfter - uBalanceBefore) / (10**8), 1000)

      console.log('DIFF USER', uBalanceAfter.sub(uBalanceBefore) / (10 ** 8))
      console.log('DIFF cWallet', mBalanceAfter.sub(mBalanceBefore) / (10 ** 8))
      console.log('DIFF MENO', bBalanceAfter.sub(bBalanceBefore) / (10 ** 8))
    }

    // const { referal, erc20, accounts } = await init();

    // const aa = await referal.getpartnerTarifs();
    // console.log('aaaaaaaaaaaaaaa', aa, accounts[1])



    // const ss = await referal.getpartnerTarifs({from: accounts[1]});
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
