var Referal = artifacts.require("ReferalPartner");
var ERC20Token = artifacts.require("ERC20Token");

module.exports = async function(deployer) {
  // deployment steps
  await deployer.deploy(ERC20Token, "ERC20", "ERC20", 8, BigInt(10 ** (8 + 6)));
  const erc20 = await ERC20Token.deployed();

  const accounts = await web3.eth.getAccounts()
  await deployer.deploy(Referal, erc20.address, accounts[9]);  
};