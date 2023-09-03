var Referal = artifacts.require("Referal");
var ERC20Token = artifacts.require("ERC20Token");
var TarifDataLib = artifacts.require("TarifDataLib");
var TarifUsageLib = artifacts.require("TarifUsageLib");
var UsersStore = artifacts.require("UsersStore");

const conf = require('./conf.json')

module.exports = async function(deployer) {
  await deployer.deploy(ERC20Token, "ERC20", "ERC20", 8, BigInt(10 ** (8 + 16)));
  const erc20 = await ERC20Token.deployed();

  await deployer.deploy(TarifDataLib);
  await deployer.link(TarifDataLib, TarifUsageLib);

  await deployer.deploy(TarifUsageLib);
  await deployer.link(TarifDataLib, Referal);
  await deployer.link(TarifUsageLib, Referal);

  await deployer.link(TarifDataLib, UsersStore);
  await deployer.link(TarifUsageLib, UsersStore);
  await deployer.deploy(UsersStore);
  const usersStore = await UsersStore.deployed()

  await deployer.deploy(Referal, erc20.address, usersStore.address);

  const referal = await Referal.deployed();
  await referal.setRegisterPrice(conf.registerPrice)
  await referal.setQBonus(conf.qBonus)
  await referal.setCWallet(conf.cWallet)
  await referal.setQWallet(conf.qWallet)
  await referal.setMWallet(conf.mWallet)

  usersStore.setOwner(referal.address)

  console.log('erc20.address', erc20.address)
  console.log('referal.address', referal.address)
  console.log('usersStore.address', usersStore.address)
};