var Referal = artifacts.require("Referal");
var ERC20Token = artifacts.require("ERC20Token");
var TarifDataLib = artifacts.require("TarifDataLib");
var UsersTarifsStore = artifacts.require("UsersTarifsStore");
var UsersFinanceStore = artifacts.require("UsersFinanceStore");
var UsersTreeStore = artifacts.require("UsersTreeStore");
const TarifsStoreBase = artifacts.require("TarifsStoreBase");
const RankMatrix = artifacts.require("RankMatrix");

const { writeFileSync } = require('fs');
const conf = require('./conf.json');
const tarifsConf = require('./tarifs.json');
const { TarifData } = require('../utils/tarif');
const { allRanks } = require('../test/utils-tarifs');

module.exports = async function (deployer) {
  // return
  let erc20Address = conf.erc20
  if (!erc20Address) {
    console.log("Deploy erc20")
    await deployer.deploy(ERC20Token, "ERC20", "ERC20", 4, BigInt(10 ** (8 + 16)));
    const erc20 = await ERC20Token.deployed();
    erc20Address = erc20.address
  }

  // --- Libs
  await deployer.deploy(TarifDataLib);

  // --- Users tree
  await deployer.deploy(UsersTreeStore);
  const usersTreeStore = await UsersTreeStore.deployed();

  // --- Finance
  await deployer.link(TarifDataLib, UsersFinanceStore);
  await deployer.deploy(UsersFinanceStore, erc20Address);
  const usersFinance = await UsersFinanceStore.deployed()

  // --- Users tarifs
  await deployer.link(TarifDataLib, UsersTarifsStore);
  await deployer.deploy(UsersTarifsStore, usersFinance.address);
  const usersTarifsStore = await UsersTarifsStore.deployed()
  await usersFinance.appendOwner(usersTarifsStore.address)

  await deployer.link(TarifDataLib, Referal);
  await deployer.deploy(Referal, UsersTarifsStore.address, usersTreeStore.address);

  const referal = await Referal.deployed();
  await referal.setRegisterPrice(conf.registerPrice)
  await referal.setQBonus(conf.qBonus)
  await referal.setCWallet(conf.cWallet)
  await referal.setQCWallet(conf.qcWallet)
  await referal.setQPWallet(conf.qpWallet)
  await referal.setMWallet(conf.mWallet)

  await usersTarifsStore.appendOwner(referal.address)
  await usersFinance.appendOwner(referal.address)

  const allTarifs = tarifsConf.tarifs.map(({ data }) => TarifData.fromObject(data))
  const clientTarifs = allTarifs.filter(x => !x.isPartner())
  const partnerTarifs = allTarifs.filter(x => x.isPartner())

  const cliTarifs = await TarifsStoreBase.at(await usersTarifsStore.clientTarifs())
  await cliTarifs.setAll(clientTarifs.map(x => x.pack()))

  const parTarifs = await TarifsStoreBase.at(await usersTarifsStore.partnerTarifs())
  await parTarifs.setAll(partnerTarifs.map(x => x.pack()))

  const key = (pk, ck) => (pk << 16) | ck;
  const keys = tarifsConf.matrix.map(x => key(x[0], x[1]))
  const percs = tarifsConf.matrix.map(x => x[2])
  await referal.setInviteMatrix(keys, percs)

  const rankMatrix = await RankMatrix.at(await referal.rankMatrix())
  await rankMatrix.setMatrix(allRanks.map(x => x.key), allRanks.map(x => x.value))

  // console.log('erc20.address', erc20Address)
  console.log('referal.address', referal.address)

  writeFileSync(__dirname + '/deploy.json', JSON.stringify({ ...conf, erc20: erc20Address, referal: referal.address }, null, 2))
};