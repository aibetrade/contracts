var Referal = artifacts.require("Referal");
var ERC20Token = artifacts.require("ERC20Token");
var TarifReaderLib = artifacts.require("TarifReaderLib");

module.exports = async function(deployer) {
  await deployer.deploy(ERC20Token, "ERC20", "ERC20", 8, BigInt(10 ** (8 + 6)));
  const erc20 = await ERC20Token.deployed();

  console.log(erc20.address)

  await deployer.deploy(TarifReaderLib);
  await deployer.link(TarifReaderLib, Referal);

  const accounts = await web3.eth.getAccounts()
  await deployer.deploy(Referal, erc20.address, accounts[8], 5, accounts[9], accounts[7]);

  const referal = await Referal.deployed();
  await referal.setRegisterPrice(50)

};