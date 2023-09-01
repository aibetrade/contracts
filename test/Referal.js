const Referal = artifacts.require("Referal");
const ERC20Token = artifacts.require("ERC20Token");
var UsersStore = artifacts.require("UsersStore");
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

const {clientTarifs, partnerTarifs, inviteBonusHash} = require('./tarifs-data')

function getInviteBonus(mTairf, uTarif) {
  return inviteBonusHash.filter(x => x[0] == mTairf.pack() && x[1] == uTarif.pack())[0][2]
}

function maxClientTarif() {
  return clientTarifs[clientTarifs.length - 1];
}

const tarifs = [...clientTarifs, ...partnerTarifs]

let stack = null

async function init(isNew = false) {
  if (isNew || !stack) {
    const accounts = await web3.eth.getAccounts()
    const referal = await Referal.deployed()

    const usersStore = await UsersStore.at(await referal.usersStore())

    stack = {
      referal,
      erc20: await ERC20Token.deployed(),
      accounts,
      usersStore,
      cliTarifs: await TarifsContractBase.at(await usersStore.clientTarifs()),
      parTarifs: await TarifsContractBase.at(await usersStore.partnerTarifs()),

      cWallet: accounts[8],
      qWallet: accounts[9],
      mWallet: accounts[7],

      C0: accounts[0],
      C1: accounts[1],
      C2: accounts[2],
      C3: accounts[3],
      C4: accounts[4],
      C5: accounts[5],
      C6: accounts[6],

      uAcc: accounts[5],
      m1Acc: accounts[4],
      m2Acc: accounts[3],
      m3Acc: accounts[2],
      m4Acc: accounts[1]
    }
  }

  return stack;
}

async function makeBalancer() {

  const dif = (a, b) => Math.round(a * 100 - b * 100) / 100

  const balancer = {
    records: [],

    async append(name) {
      const { erc20, C1, C2, C3, C4, C5, cWallet, qWallet, mWallet } = await init();

      const rec = {
        name,
        company: await fromErc20(await erc20.balanceOf(cWallet)),
        quart: await fromErc20(await erc20.balanceOf(qWallet)),
        magic: await fromErc20(await erc20.balanceOf(mWallet)),
        c1: await fromErc20(await erc20.balanceOf(C1)),
        c2: await fromErc20(await erc20.balanceOf(C2)),
        c3: await fromErc20(await erc20.balanceOf(C3)),
        c4: await fromErc20(await erc20.balanceOf(C4)),
        c5: await fromErc20(await erc20.balanceOf(C5)),
      }

      rec.uAcc = rec.c5
      rec.m1Acc = rec.c4
      rec.m2Acc = rec.c3
      rec.m3Acc = rec.c2
      rec.m4Acc = rec.c1

      this.records.push(rec)
    },

    printAll() {
      let last = null
      for (let rec of this.records) {
        console.log('Step', rec.name)

        console.table(rec)

        if (last) {
          // console.log('Diff', `Company: ${rec.company - last.company}`, `Quart: ${rec.quart - last.quart}`, `Magic: ${rec.magic - rec.magic}`, `C1: ${rec.c1 - last.c1}`, `C2: ${rec.c2 - rec.c2}`,)
          console.log('Diff', `C: ${dif(rec.company, last.company)}`, `Q: ${dif(rec.quart, last.quart)}`, `M: ${dif(rec.magic, last.magic)}`, `C1: ${dif(rec.c1, last.c1)}`, `C2: ${dif(rec.c2, last.c2)}`,)
        }
        last = rec
      }
    },

    print(name) {
      const recs = this.records.filter(x => x.name == name)
      for (let rec of recs) {
        console.log(rec)
      }
    },

    diff(nameb, namea) {
      const reca = this.records.filter(x => x.name == namea)[0]
      const recb = this.records.filter(x => x.name == nameb)[0]

      if (reca && recb) {
        const diffRec = {
          name: `${nameb} - ${namea}`,
          company: dif(recb.company, reca.company),
          quart: dif(recb.quart, reca.quart),
          magic: dif(recb.magic, reca.magic),
          c1: dif(recb.c1, reca.c1),
          c2: dif(recb.c2, reca.c2),
          c3: dif(recb.c3, reca.c3),
          c4: dif(recb.c4, reca.c4),
          c5: dif(recb.c5, reca.c5),
        }

        diffRec.uAcc = diffRec.c5
        diffRec.m1Acc = diffRec.c4
        diffRec.m2Acc = diffRec.c3
        diffRec.m3Acc = diffRec.c2
        diffRec.m4Acc = diffRec.c1

        return diffRec
      }
      else
        return {}
    },

    diff2(nameb, namea) {
      const reca = this.records.filter(x => x.name == namea)[0]
      const recb = this.records.filter(x => x.name == nameb)[0]

      if (reca && recb) {
        const diffRec = {
          name: `${nameb} - ${namea}`,
          company: dif(recb.company, reca.company),
          quart: dif(recb.quart, reca.quart),
          magic: dif(recb.magic, reca.magic),
          c1: dif(recb.c1, reca.c1),
          c2: dif(recb.c2, reca.c2),
          c3: dif(recb.c3, reca.c3),
          c4: dif(recb.c4, reca.c4),
          c5: dif(recb.c5, reca.c5),
        }

        diffRec.uAcc = diffRec.c5
        diffRec.m1Acc = diffRec.c4
        diffRec.m2Acc = diffRec.c3
        diffRec.m3Acc = diffRec.c2
        diffRec.m4Acc = diffRec.c1

        delete diffRec.c5
        delete diffRec.c4
        delete diffRec.c3
        delete diffRec.c2
        delete diffRec.c1

        return diffRec
      }
      else
        return {}
    },

    printDiff(nameb, namea) {
      console.log(this.diff(nameb, namea))
    }
  }

  await balancer.append('init')

  return balancer
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
  const { referal, usersStore, accounts } = await init();

  acc = acc || accounts[0]

  const ucTarif = await usersStore.cTarifs(acc)
  assert.deepEqual(ctarif, TarifData.fromPack(ucTarif.tarif))
}

async function userHasPTarif(ptarif, acc = null) {
  const { referal, usersStore, accounts } = await init();

  acc = acc || accounts[0]

  const upTarif = await usersStore.pTarifs(acc)
  assert.deepEqual(ptarif, TarifData.fromPack(upTarif.tarif))
}

async function getLastBuy(acc = null) {
  const { usersStore, accounts } = await init();
  acc = acc || accounts[0]
  const buyHistory = await usersStore.getBuyHistory(acc)
  return buyHistory[buyHistory.length - 1]
}

// Get all comsas
async function getAllComsasOf(partner) {
  const { referal, usersStore, C1, C2 } = await init();

  let result = []
  const refs = await usersStore.getReferals(partner)
  for (let ref of refs) {
    const history = await usersStore.getBuyHistory(ref)

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

async function prettyHistory(acc = null) {
  const { referal, usersStore, accounts } = await init();
  acc = acc || accounts[0]

  const history = (await usersStore.getBuyHistory(acc)).map((x, i) => {
    const { timestamp, tarif, count } = x
    const tar = TarifData.fromPack(tarif)
    const { key, price, isRejected, isComsaTaken } = tar
    return { client: acc, index: i, count: parseInt(count), price, key, isRejected, isComsaTaken, timestamp, tarif }
  })

  return history
}

function prettyHistoryRec(rec) {
  const { from, timestamp, tarif, count } = rec
  const tar = TarifData.fromPack(tarif)
  const { key, price, isRejected, isComsaTaken } = tar
  return { client: from, count: parseInt(count), price, key, isRejected, isComsaTaken, timestamp, tarif }
}

async function printBuyHistory(acc = null) {
  const { referal, accounts , usersStore} = await init();
  acc = acc || accounts[0]

  const history = (await usersStore.getBuyHistory(acc)).map((x, i) => {
    const { timestamp, tarif, count } = x
    const tar = TarifData.fromPack(tarif)
    const { key, price, isRejected, isComsaTaken } = tar
    return { client: acc, index: i, count: parseInt(count), price, key, isRejected, isComsaTaken, timestamp, tarif }
  })

  console.log(history)
}

async function register(acc = null) {
  const { erc20, referal, accounts } = await init();
  acc = acc || accounts[0]

  const regPrice = await toErc20(await referal.registerPrice());
  await erc20.approve(referal.address, await toErc20(regPrice), { from: acc });
  return referal.regitsterPartner({ from: acc })
}

async function getBuyPriceDollar(tarif, acc = null) {
  const { erc20, referal, usersStore, accounts } = await init();
  acc = acc || accounts[0]

  console.log("TARIF", tarif)

  if (tarif.isPartner()) {
    const ext = TarifUsage.fromPack((await usersStore.getUsage(acc)).extLevel || 1)
    return tarif.price * ext
  }
  else {
    return tarif.price
  }
}


async function buyTarif(tarif, acc = null) {
  const { erc20, referal, usersStore, accounts } = await init();
  acc = acc || accounts[0]

  const refBalanceBefore = await erc20.balanceOf(referal.address)

  const ucTarifWas = await usersStore.cTarifs(acc)
  const upTarifWas = await usersStore.pTarifs(acc)
  const userWas = await usersStore.users(acc)

  const buyHistoryWas = await usersStore.getBuyHistory(acc)

  const price = await getBuyPriceDollar(tarif, acc)
  const wasPartnerTarifActive = await usersStore.isPartnerTarifActive(acc)


  // --- Buy logic ---
  await erc20.approve(referal.address, await toErc20(price, erc20), { from: acc });
  if (tarif.isPartner())
    await referal.buyPartnerTarif(tarif.pack(), { from: acc })
  else
    await referal.buyClientTarif(tarif.pack(), { from: acc })
  // === Buy logic ===

  const userAfter = await usersStore.users(acc)

  const refBalanceAfter = await erc20.balanceOf(referal.address)
  if (await fromErc20(refBalanceAfter.sub(refBalanceBefore)) != price) throw "Income incorrect"

  // Check tarif exists
  if (tarif.isPartner())
    await userHasPTarif(tarif, acc)
  else
    await userHasCTarif(tarif, acc)

  // --- Check buy history
  const buyHistory = await usersStore.getBuyHistory(acc)
  if (buyHistory.length - 1 != buyHistoryWas.length) throw "Buy history not changed"

  const lastBuy = buyHistory[buyHistory.length - 1]
  if (lastBuy.tarif.toString() != tarif.pack()) throw "Last buy tarif not added to history"

  // --- Check rollback saved ok 
  const uRollback = await usersStore.rollbacks(acc)

  // Check rollback info is correct
  if (tarif.isPartner()) {
    if (uRollback.tarif.toString() != upTarifWas.tarif.toString()) throw "partnerTarif tarif not saved"
    if (uRollback.date.toString() != upTarifWas.boughtAt.toString()) throw "partnerTarif date not saved"
    if (uRollback.usage.toString() != userWas.partnerTarifUsage.toString()) throw "partnerTarif usage not saved"
  }
  else {
    if (uRollback.tarif.toString() != ucTarifWas.tarif.toString()) throw "clientTarif tarif not saved"
    if (uRollback.date.toString() != ucTarifWas.boughtAt.toString()) throw "clientTarif date not saved"
  }

  // --- Check ext level is correct
  if (tarif.isPartner()) {
    const usageBefore = TarifUsage.fromPack(userWas.partnerTarifUsage)
    const usageAfter = TarifUsage.fromPack(userAfter.partnerTarifUsage)

    console.log({ usageBefore, usageAfter })
    // console.log(upTarifWas.tarif.toString(), tarif.pack().toString())

    if (wasPartnerTarifActive) {
      if (upTarifWas.tarif.toString() == tarif.pack().toString()) {
        if (usageAfter.extLevel - usageBefore.extLevel != 1) throw "Extend tarif. EXT incorrect"
      }
      else {
        if (usageAfter.extLevel != usageBefore.extLevel) throw "Upgrade tarif. EXT incorrect"
      }
    }
    else {
      if (usageAfter.extLevel != 1) throw "New tarif must have. EXT=1"
    }
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
  return Number(Number(wei) / (10 ** Number(decimals)));
}

contract("Referal-Tarif", function (/* accounts */) {
  it("Created succefully", async function () {
    const { referal, accounts } = await init();

    console.log(referal.address, accounts)

  })

  it("All accounts have access to contract", async function () {
    const { referal, usersStore, accounts } = await init();

    const cliTarifs = await TarifsContractBase.at(await usersStore.clientTarifs())
    const parTarifs = await TarifsContractBase.at(await usersStore.partnerTarifs())

    for (let acc of accounts) {
      await cliTarifs.getAll({ from: acc })
      await parTarifs.getAll({ from: acc })
    }
  })

  it("Olny OWNER can add and remove tarifs", async function () {
    const { referal, usersStore, accounts } = await init();

    const cliTarifs = await TarifsContractBase.at(await usersStore.clientTarifs())
    const parTarifs = await TarifsContractBase.at(await usersStore.partnerTarifs())

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


  // it("Tarif price is correct", async function () {
  //   const { referal } = await init();

  //   for (let i = 0; i < tarifs.length; i++) {
  //     const price = await referal.getPrice(tarifs[i].pack())
  //     assert.equal(price.toNumber(), tarifs[i].price)
  //   }
  // });

  // Check can buy partner tarif
  it("Get user test", async function () {
    const { referal, usersStore, accounts } = await init();
    const ucTarif = await usersStore.cTarifs(accounts[0]);
    assert.equal(ucTarif.tarif, 0)
    assert.equal(ucTarif.boughtAt, 0)

    const upTarif = await usersStore.pTarifs(accounts[0]);
    assert.equal(upTarif.tarif, 0)
    assert.equal(upTarif.boughtAt, 0)

    const user = await usersStore.users(accounts[0]);
    assert.equal(user.partnerTarifUsage, 0)
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
    const { usersStore, cWallet } = await init();
    await usersStore.setMentor(cWallet)
  })

  it("Can NOT change mentor", async function () {
    const { usersStore, C1 } = await init();
    await mustFail(usersStore.setMentor(C1))
  })

  it("Can buy client tarif with money and mentor", async function () {
    const { referal, usersStore, accounts } = await init();

    await buyTarif(tarifs[0])

    assert.equal(await usersStore.hasActiveMaxClientTarif(accounts[0]), false);
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
    const { referal, usersStore, erc20, accounts } = await init();
    const ct = clientTarifs[clientTarifs.length - 1]

    await span49h();

    const no = await usersStore.hasActiveMaxClientTarif(accounts[0])
    assert.deepEqual(no, false)

    await buyTarif(ct)

    const yes = await usersStore.hasActiveMaxClientTarif(accounts[0])
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

  it("giev 10000USDT to C1, C2, C3, C4, C5", async function () {
    const { erc20, C1, C2, C3, C4, C5, C6 } = await init();

    await erc20.transfer(C1, await toErc20(10000))
    await erc20.transfer(C2, await toErc20(10000))
    await erc20.transfer(C3, await toErc20(10000))
    await erc20.transfer(C4, await toErc20(10000))
    await erc20.transfer(C5, await toErc20(10000))
    await erc20.transfer(C6, await toErc20(10000))
  })

  it("C1 buy max ctarif, register, ptarif-0", async function () {
    const { referal, usersStore, C1, cWallet } = await init();

    await usersStore.setMentor(cWallet, { from: C1 })

    await buyTarif(maxClientTarif(), C1)
    await span49h();

    await register(C1);
    await span49h();

    await buyTarif(partnerTarifs[0], C1)
    await span49h();
  })

  it("C1 is mentor of c2", async function () {
    const { referal, usersStore, C1, C2 } = await init();

    await usersStore.setMentor(C1, { from: C2 })
    const user = await usersStore.users(C2)
    assert.deepEqual(user.mentor, C1)
  })

  it("define InviteMatrix", async function () {
    const { referal, C1, C2 } = await init();

    for (let rec of inviteBonusHash) {
      // console.log(TarifData.fromPack(rec[0]).key, TarifData.fromPack(rec[1]).key, rec[2])
      await referal.setInvitePercent(rec[0], rec[1], rec[2]);
    }

    for (let rec of inviteBonusHash) {
      // console.log(TarifData.fromPack(rec[0]).key, TarifData.fromPack(rec[1]).key, rec[2], Number(await referal.getInvitePercent(rec[0], rec[1])))
      assert.deepEqual(Number(await referal.getInvitePercent(rec[0], rec[1])), rec[2]);
    }
  })

  it("get all comissions of Company (root partners)", async function () {
    const { referal, C1, cWallet, erc20 } = await init();

    await span49h();

    const comsasBefore = await getAllComsasOf(cWallet);
    const unusedComsasBefore = comsasBefore.filter(x => !x.isRejected && !x.isComsaTaken)
    const cBalanceBefore = await erc20.balanceOf(cWallet)

    let sum = 0;
    for (let com of unusedComsasBefore) {
      sum += com.price
      await referal.takeComsa(com.client, com.index)
    }

    const cBalanceAfter = await erc20.balanceOf(cWallet)
    assert.deepEqual(sum, await fromErc20(cBalanceAfter.sub(cBalanceBefore)))
  })

  it("C2 buy ctarif then C1 getComission", async function () {
    const { referal, erc20, C1, C2, cWallet, qWallet, mWallet } = await init();

    await buyTarif(clientTarifs[0], C2)
    await mustFail(referal.takeComsa(C2, 0))
    await span49h();

    // Get all comsas
    const comsasBefore = await getAllComsasOf(C1);
    const unusedComsasBefore = comsasBefore.filter(x => !x.isRejected && !x.isComsaTaken)

    const bals = await makeBalancer()

    await referal.takeComsa(unusedComsasBefore[0].client, unusedComsasBefore[0].index)

    await bals.append('After')

    const comsasAfter = await getAllComsasOf(C1);
    const unusedComsasAfter = comsasAfter.filter(x => !x.isRejected && !x.isComsaTaken)

    assert.deepEqual(unusedComsasAfter.length, unusedComsasBefore.length - 1)

    bals.print()
  })

  async function getUserInfo(acc = null) {
    const { referal, usersStore, accounts } = await init();
    acc = acc || accounts[0]

    const active = await usersStore.isPartnerActive(acc)
    const cTarifInfo = await usersStore.cTarifs(acc)

    const pTarifInfo = await usersStore.pTarifs(acc)

    const pTarifUsageInfo = (await usersStore.users(acc)).partnerTarifUsage
    const pTarifUsage = TarifUsage.fromPack(pTarifUsageInfo)

    const hasSlot = await usersStore.hasSlot(acc)
    const hasLVSlot = await usersStore.hasLVSlot(acc)

    // cTarifInfo.tarif = TarifData.fromPack(cTarifInfo.tarif)
    // pTarifInfo.tarif = TarifData.fromPack(pTarifInfo.tarif)

    return {
      acc,
      active,
      cTarifRaw: cTarifInfo.tarif,
      cTarifInfo: {
        tarif: TarifData.fromPack(cTarifInfo.tarif),
        boughtAt: Number(cTarifInfo.boughtAt),
        gotInviteBonus: cTarifInfo.gotInviteBonus
      },
      pTarifRaw: pTarifInfo.tarif,
      pTarifInfo: {
        tarif: TarifData.fromPack(pTarifInfo.tarif),
        boughtAt: Number(pTarifInfo.boughtAt),
        gotInviteBonus: pTarifInfo.gotInviteBonus

      },
      pTarifUsage,
      hasSlot,
      hasLVSlot,
    }
  }

  async function buildTreeUp(acc = null) {
    const { referal, accounts } = await init();
    acc = acc || accounts[0]

    const tree = []

    const cWallet = await referal.cWallet()

    for (let i = 0; i < 16; i++) {
      if (acc == zeroAddress || acc == cWallet) break;
      const info = await getUserInfo(acc);
      tree.push(info)


      acc = (await referal.users(acc)).mentor
    }
    return tree
  }

  async function processUserFirstComsa(acc = null) {
    const { referal, accounts } = await init();
    acc = acc || accounts[0]

    const buyHistory = (await prettyHistory(acc)).filter(x => !x.isComsaTaken && !x.isRejected)
    const lastComsaRec = buyHistory[0]
    if (!lastComsaRec) return;

    const tar = TarifData.fromPack(lastComsaRec.tarif)
    // const gotInviteBonus = (await (tar.isPartner() ? referal.pTarifs(acc) : referal.cTarifs(acc))).gotInviteBonus

    const tree = await buildTreeUp(acc)

    const mentor = (await referal.users(acc)).mentor
    // console.log(tree)
    // return

    const uInfoBefore = await getUserInfo(acc)
    const mInfoBefore = await getUserInfo(mentor)
    const bals = await makeBalancer()

    await referal.takeComsa(acc, lastComsaRec.index)

    const uInfoAfter = await getUserInfo(acc)
    const mInfoAfter = await getUserInfo(mentor)

    // Check slots
    if (mInfoBefore.hasSlot) {
      if (mInfoAfter.pTarifUsage.usedSlots - mInfoBefore.pTarifUsage.usedSlots != 1) throw "usedSlots error"
    } else {
      if (mInfoAfter.pTarifUsage.usedSlots - mInfoBefore.pTarifUsage.usedSlots != 0) throw "usedSlots error"
    }

    let m1Comsa = 0

    {
      const tarifData = tar.isPartner() ? uInfoBefore.pTarifInfo : uInfoBefore.cTarifInfo;
      // console.log(tarifData.gotInviteBonus)

      if (!tarifData.gotInviteBonus)
        m1Comsa += getInviteBonus(mInfoBefore.pTarifInfo.tarif, uInfoAfter.cTarifInfo.tarif) * tar.price / 100
    }


    // console.log(m1Comsa)

    // console.log(await Promise.all(tree.map(x => referal.getLV(x.pTarifRaw))))

    // console.log(tree.map(x => x.pTarifInfo.tarif.numLVSlots))
    // console.log(tree.map(x => x.pTarifInfo.tarif.LV))
    // console.log(tree.map(x => x.pTarifUsage))

    // Calc top comsas

    // Check mentor comsa

    // Check lv slots



    await bals.append("after")
    // console.log(bals.diff2('after', 'init'))

    // console.log('uinfo', uInfoBefore, uInfoAfter)
    // console.log('minfo', mInfoBefore, mInfoAfter)

    const d = bals.diff('after', 'init')
    const { price, count } = lastComsaRec
    const sumPayed = price * count

    assert.deepEqual(sumPayed * 30 / 100, d.company)
    assert.deepEqual(sumPayed * 5 / 100, d.quart)

    // console.log(bals.diff2('after', 'init'))

    let mentorCom = 0
    // if (!gotInviteBonus){
    //   const m1PTarif = await referal.pTarifs[m1Acc].tarif
    //   const ip = inviteMatrix[m1PTarif, hrec.tarif]
    //   mentorCom += sum * ip / 100
    // }
  }

  it("build chan C1->C2->C3->C4->C5 + register", async function () {
    const { referal, usersStore, erc20, C1, C2, C3, C4, C5 } = await init();


    const uAcc = C5;
    const m1Acc = C4;
    const m2Acc = C3;
    const m3Acc = C2;
    const m4Acc = C1;

    // await referal.setMentor(C1, { from: C2 })
    await usersStore.setMentor(m1Acc, { from: uAcc })
    await usersStore.setMentor(m2Acc, { from: m1Acc })
    await usersStore.setMentor(m3Acc, { from: m2Acc })
    // await referal.setMentor(m4Acc, { from: m3Acc })    

    await buyTarif(maxClientTarif(), uAcc)
    await buyTarif(maxClientTarif(), m1Acc)
    await buyTarif(maxClientTarif(), m2Acc)
    await buyTarif(maxClientTarif(), m3Acc)
    await buyTarif(maxClientTarif(), m4Acc)
    await span49h();

    await register(m1Acc)
    await register(m2Acc)
    await register(m3Acc)
    await span49h();
  })

  it("All buy partner tarifs", async function () {
    const { referal, erc20, C1, C2, C3, C4, C5 } = await init();

    const uAcc = C5;
    const m1Acc = C4;
    const m2Acc = C3;
    const m3Acc = C2;
    const m4Acc = C1;

    await buyTarif(partnerTarifs[0], m1Acc)
    await buyTarif(partnerTarifs[2], m2Acc)
    await buyTarif(partnerTarifs[3], m3Acc)
    await span49h();
  })

  // it("Take comsa (slot free)", async function () {
  //   const { referal, erc20, uAcc, m1Acc } = await init();

  //   const ui1Before = await getUserInfo(m1Acc)

  //   await buyTarif(maxClientTarif(), uAcc)
  //   await span49h();

  //   await processUserFirstComsa(uAcc)

  //   const ui1After = await getUserInfo(m1Acc)


  //   // console.log(ui1Before, ui1After)

  // })

  it("Take comsa test", async function () {
    const { referal, erc20, uAcc, m1Acc } = await init();

    for (let i = 0; i < 4; i++) {

      await buyTarif(maxClientTarif(), uAcc)
      await span49h();

      await processUserFirstComsa(uAcc)
    }

    return
  })

  it("Can extend filled tarif", async function () {
    const { referal, erc20, uAcc, m1Acc } = await init();

    // // const tarif = TarifData.fromPack((await referal.pTarifs(m1Acc)).tarif)
    // // const usage = TarifUsage.fromPack((await referal.users(m1Acc)).partnerTarifUsage)

    // console.log({tarif, usage})

    await buyTarif(partnerTarifs[0], m1Acc);
  })

  it("Take comsa test", async function () {
    const { referal, erc20, uAcc, m1Acc } = await init();

    for (let i = 0; i < 10; i++) {

      await buyTarif(maxClientTarif(), uAcc)
      await span49h();

      await processUserFirstComsa(uAcc)
    }
  })

  it("Can upgrade filled tarif", async function () {
    const { referal, usersStore, erc20, uAcc, m1Acc } = await init();

    const tarif = TarifData.fromPack((await usersStore.pTarifs(m1Acc)).tarif)
    const usage = TarifUsage.fromPack(await usersStore.getUsage(m1Acc))

    console.log({ tarif, usage })

    await buyTarif(maxClientTarif(), m1Acc)
    await span49h();

    await buyTarif(partnerTarifs[2], m1Acc);
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
