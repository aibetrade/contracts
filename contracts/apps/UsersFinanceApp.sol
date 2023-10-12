// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// import "../Tarif.sol";
import "../utils/ERC20Token.sol";
import "./BaseApp.sol";
import "../stores/BuyHistory.sol";
import "../stores/PayHistory.sol";
import "../stores/AddressFlagsStore.sol";
import "../utils/const.sol";

contract UsersFinanceApp is BaseApp {

    function rejectBuy(address _acc) public onlyMember {
        ERC20Token erc20 = appStore.apps(ERC20_APP_CODE);
        BuyHistory buyHistory = appStore.apps(BUY_HISTORY_CODE);

        uint256 last = buyHistory.getHistoryCount(_acc);
        require(last > 0, "History empty");

        last--;

        // Mark buy as rejected
        BuyHistoryRec memory buy = buyHistory.getHistoryRec(_acc, last);
        require(buy.state == 0, "Buy is fixed");

        buy.state = BUY_STATE_REJECTED;
        buyHistory.setHistoryRec(_acc, last, buy);
        
        erc20.transfer(_acc, centToErc20(buy.payed * 100));

        AddressFlagsStore comsa = appStore.apps(COMSAS_STORE_CODE);
        comsa.setFlag(_acc, false);
    }

    function centToErc20(uint256 _cents) public view returns (uint256){
        ERC20Token erc20 = appStore.apps(ERC20_APP_CODE);
        return _cents * (10 ** (erc20.decimals() - 2));
    }

    function freezeMoney(uint32 dollar, address _from) public {
        ERC20Token erc20 = appStore.apps(ERC20_APP_CODE);
        erc20.transferFrom(_from, address(this), centToErc20(dollar * 100));
    }

    function makePayment(address _from, address _to, uint64 _cent, uint8 _payCode) public onlyMember {
        ERC20Token erc20 = appStore.apps(ERC20_APP_CODE);
        erc20.transfer(_to, centToErc20(_cent));

        PayHistory payHistory = appStore.apps(PAY_HISTORY_APP_CODE);
        payHistory.append(_to, PayHistoryRec({timestamp: block.timestamp, cents: _cent, from: _from, payCode: _payCode}));

        // if (users[_to].buyHistory.length == 0) return;
        // BuyHistoryRec storage buy = users[_to].buyHistory[users[_to].buyHistory.length - 1];
        // if (buy.state == 0)
        // buy.state = BUY_STATE_ACCEPTED;
    }
}