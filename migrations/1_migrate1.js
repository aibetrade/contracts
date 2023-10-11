process.env.TZ = 'Europe/London';

var Referal = artifacts.require("Referal");
var ERC20Token = artifacts.require("ERC20Token");
var TarifDataLib = artifacts.require("TarifDataLib");
var UsersTarifsStore = artifacts.require("UsersTarifsStore");
var UsersFinanceStore = artifacts.require("UsersFinanceStore");
var UsersTreeStore = artifacts.require("UsersTreeStore");
const TarifsStoreBase = artifacts.require("TarifsStoreBase");
const RankMatrix = artifacts.require("RankMatrix");

const { writeFileSync } = require('fs');
const tarifsConf = require('./conf/tarifs.json');
const { TarifData } = require('../utils/tarif');
const { allRanks } = require('../test/utils-conf');
// const { allRanks } = require('../test/utils-tarifs');

async function baseInstllation(deployer, network, accounts) {
  network = network || ''

  console.log('Deploy in network: ', network)

  const conf = network ? require(`./conf/${network.toLowerCase()}.conf.json`) : require(`./conf/conf.json`);
  console.log('With params: ', conf)

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
  // await deployer.deploy(Referal, usersTarifsStore.address, usersTreeStore.address);
  await deployer.deploy(Referal);

  const referal = await Referal.deployed();
  await referal.setRegisterPrice(conf.registerPrice)
  await referal.setQBonus(conf.qBonus)
  await referal.setCWallet(conf.cWallet)
  await referal.setQCWallet(conf.qcWallet)
  await referal.setQPWallet(conf.qpWallet)
  await referal.setMWallet(conf.mWallet)

  await referal.setUsersTarifsStore(usersTarifsStore.address);
  await referal.setUsersTreeStore(usersTreeStore.address);

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

  await deployer.deploy(RankMatrix);
  const rankMatrix = await RankMatrix.deployed();
  await rankMatrix.setMatrix(allRanks.map(x => x.key), allRanks.map(x => x.value))
  await referal.setRankMatrix(rankMatrix.address);
  await rankMatrix.appendOwner(referal.address)

  // console.log('erc20.address', erc20Address)
  console.log('referal.address', referal.address)

  const filename = __dirname + `/history/${network}.${new Date().toJSON().substring(0, 16).replace(':', '-')}.deploy.json`
  const data = {
    ...conf,
    accounts,
    erc20: erc20Address,
    referal: referal.address,
    usersTarifsStore: usersTarifsStore.address,
    usersTreeStore: usersTreeStore.address,
    usersFinance: usersFinance.address,
    tarifDataLib: TarifDataLib.address,
    rankMatrix: rankMatrix.address    
  }

  if (network != 'test')
    writeFileSync(filename, JSON.stringify(data, null, 2))
  
  writeFileSync( __dirname + `/history/deploy.json`, JSON.stringify(data, null, 2))
  writeFileSync( __dirname + `/history/conf.json`, JSON.stringify(conf, null, 2))
};

async function replaceReferal(deployer, network, accounts) {
  network = network || ''

  console.log('Deploy in network: ', network, REFERAL_ADDRESS)

  return;

  const conf = network ? require(`./conf/${network.toLowerCase()}.conf.json`) : require(`./conf/conf.json`);
  console.log('With params: ', conf)

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
  // await deployer.deploy(Referal, usersTarifsStore.address, usersTreeStore.address);
  await deployer.deploy(Referal);

  const referal = await Referal.deployed();
  await referal.setRegisterPrice(conf.registerPrice)
  await referal.setQBonus(conf.qBonus)
  await referal.setCWallet(conf.cWallet)
  await referal.setQCWallet(conf.qcWallet)
  await referal.setQPWallet(conf.qpWallet)
  await referal.setMWallet(conf.mWallet)

  await referal.setUsersTarifsStore(usersTarifsStore.address);
  await referal.setUsersTreeStore(usersTreeStore.address);

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

  await deployer.deploy(RankMatrix);
  const rankMatrix = await RankMatrix.deployed();
  await rankMatrix.setMatrix(allRanks.map(x => x.key), allRanks.map(x => x.value))
  await referal.setRankMatrix(rankMatrix.address);
  await rankMatrix.appendOwner(referal.address)

  // console.log('erc20.address', erc20Address)
  console.log('referal.address', referal.address)

  const filename = __dirname + `/history/${network}.${new Date().toJSON().substring(0, 16).replace(':', '-')}.deploy.json`
  const data = {
    ...conf,
    accounts,
    erc20: erc20Address,
    referal: referal.address,
    usersTarifsStore: usersTarifsStore.address,
    usersTreeStore: usersTreeStore.address,
    usersFinance: usersFinance.address,
    tarifDataLib: TarifDataLib.address,
    rankMatrix: rankMatrix.address    
  }

  if (network != 'test')
    writeFileSync(filename, JSON.stringify(data, null, 2))
  
  writeFileSync( __dirname + `/history/deploy.json`, JSON.stringify(data, null, 2))
  writeFileSync( __dirname + `/history/conf.json`, JSON.stringify(conf, null, 2))
};

const REFERAL_ADDRESS = '0x9BeCF528c1d345E5b05d886dD1ee5B849F733628'

module.exports = baseInstllation