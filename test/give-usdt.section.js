const { init, toErc20 } = require("./utils");

module.exports = () => {
    it("Give all by 10000 USDT", async function () {
        const { erc20, uAcc, m1Acc, m2Acc, m3Acc, m4Acc, m5Acc } = await init();
    
        const bal = await toErc20(10000)
    
        await erc20.transfer(uAcc, bal)
        await erc20.transfer(m1Acc, bal)
        await erc20.transfer(m2Acc, bal)
        await erc20.transfer(m3Acc, bal)
        await erc20.transfer(m4Acc, bal)
        await erc20.transfer(m5Acc, bal)
      })
}