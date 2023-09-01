var Referal = artifacts.require("Referal");
var ERC20Token = artifacts.require("ERC20Token");
var TarifDataLib = artifacts.require("TarifDataLib");
var TarifUsageLib = artifacts.require("TarifUsageLib");
var UsersStore = artifacts.require("UsersStore");

module.exports = async function(deployer) {
  await deployer.deploy(ERC20Token, "ERC20", "ERC20", 8, BigInt(10 ** (8 + 6)));
  const erc20 = await ERC20Token.deployed();

  console.log(erc20.address)

  await deployer.deploy(TarifDataLib);
  await deployer.link(TarifDataLib, TarifUsageLib);

  await deployer.deploy(TarifUsageLib);
  await deployer.link(TarifDataLib, Referal);
  await deployer.link(TarifUsageLib, Referal);

  await deployer.link(TarifDataLib, UsersStore);
  await deployer.link(TarifUsageLib, UsersStore);
  await deployer.deploy(UsersStore);
  const usersStore = await UsersStore.deployed()

  const accounts = await web3.eth.getAccounts()
  await deployer.deploy(Referal, erc20.address, usersStore.address, accounts[8], 5, accounts[9], accounts[7]);

  const referal = await Referal.deployed();
  await referal.setRegisterPrice(50)

  usersStore.setOwner(referal.address)
};