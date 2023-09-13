var Referal = artifacts.require("Referal");
var ERC20Token = artifacts.require("ERC20Token");
var TarifDataLib = artifacts.require("TarifDataLib");
var TarifUsageLib = artifacts.require("TarifUsageLib");
var UsersTarifsStore = artifacts.require("UsersTarifsStore");
var UsersFinanceStore = artifacts.require("UsersFinanceStore");
var UsersTreeStore = artifacts.require("UsersTreeStore");

const { writeFileSync } = require('fs');
const conf = require('./conf.json');

module.exports = async function(deployer) {
  // return
  let erc20Address = conf.erc20
  if (!erc20Address){
    console.log("Deploy erc20")
    await deployer.deploy(ERC20Token, "ERC20", "ERC20", 4, BigInt(10 ** (8 + 16)));
    const erc20 = await ERC20Token.deployed();
    erc20Address = erc20.address
  }

  // --- Libs
  await deployer.deploy(TarifDataLib);  

  await deployer.link(TarifDataLib, TarifUsageLib);
  await deployer.deploy(TarifUsageLib);

  // --- Users tree
  await deployer.deploy(UsersTreeStore);
  const usersTreeStore = await UsersTreeStore.deployed();

  // --- Finance
  await deployer.link(TarifDataLib, UsersFinanceStore);
  await deployer.link(TarifUsageLib, UsersFinanceStore);
  await deployer.deploy(UsersFinanceStore, erc20Address);
  const usersFinance = await UsersFinanceStore.deployed()

  // --- Users tarifs
  await deployer.link(TarifDataLib, UsersTarifsStore);
  await deployer.link(TarifUsageLib, UsersTarifsStore);
  await deployer.deploy(UsersTarifsStore, usersFinance.address);
  const usersTarifsStore = await UsersTarifsStore.deployed()
  await usersFinance.appendOwner(usersTarifsStore.address)

  await deployer.link(TarifDataLib, Referal);
  await deployer.link(TarifUsageLib, Referal);
  await deployer.deploy(Referal, UsersTarifsStore.address, usersTreeStore.address);

  const referal = await Referal.deployed();
  await referal.setRegisterPrice(conf.registerPrice)
  await referal.setQBonus(conf.qBonus)
  await referal.setCWallet(conf.cWallet)
  await referal.setQWallet(conf.qWallet)
  await referal.setMWallet(conf.mWallet)

  await usersTarifsStore.appendOwner(referal.address)
  await usersFinance.appendOwner(referal.address)

  // console.log('erc20.address', erc20Address)
  console.log('referal.address', referal.address)

  writeFileSync(__dirname + '/deploy.json', JSON.stringify({...conf, erc20: erc20Address, referal: referal.address}, null, 2))
};