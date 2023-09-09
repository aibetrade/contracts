// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./OnlyOwner.sol";
import "./ERC20Token.sol";
import "./UsersTarifsStore.sol";
import "./UsersTreeStore.sol";

contract Referal is OnlyOwner {
    // ERC20Token public erc20;

    UsersTarifsStore public usersTarifsStore;
    UsersFinanceStore public usersFinance;
    UsersTreeStore public usersTree;

    ERC20Token public erc20;

    // function setUsersFinance(address _contract) public onlyOwner{
    //     usersFinance = UsersFinanceStore(_contract);
    // }

     constructor(address _usersTarifsStoreAddress, address _usersTreeAddress) {
        // erc20 = ERC20Token(_erc20);
        usersTarifsStore = UsersTarifsStore(_usersTarifsStoreAddress);
        usersFinance = UsersFinanceStore(usersTarifsStore.usersFinance());
        usersTree = UsersTreeStore(_usersTreeAddress);
        erc20 = ERC20Token(usersFinance.erc20());
    }

    address public cWallet;
    function setCWallet(address _cWallet) public onlyOwner {
        require(_cWallet != address(0));
        cWallet = _cWallet;
    }

    address public qWallet;
    function setQWallet(address _qWallet) public onlyOwner {
        require(_qWallet != address(0));
        qWallet = _qWallet;
    }

    address public mWallet;
    function setMWallet(address _mWallet) public onlyOwner {
        require(_mWallet != address(0));
        mWallet = _mWallet;
    }

    uint16 public qBonus;
    function setQBonus(uint8 _qBonus) public onlyOwner {
        require(_qBonus < 101);
        qBonus = _qBonus;
    }

    mapping(uint32 => uint8) public inviteMatix;
    /**
        Set invite percent for partner tarif selling client tarif.
        @param _pTarif parent tarif
        @param _cTarif client tarif (sell from parent)
        @param _percent Invite percent (give once)
     */
    function setInvitePercent(uint256 _pTarif, uint256 _cTarif, uint8 _percent) public onlyOwner {
        require(_percent < 101);

        uint32 pTarifKey = TarifDataLib.tarifKey(_pTarif);
        uint32 cTarifKey = TarifDataLib.tarifKey(_cTarif);

        uint32 key = pTarifKey | (cTarifKey << 16);
        inviteMatix[key] = _percent;
    }

    function getInvitePercent(uint256 _pTarif, uint256 _cTarif) public view returns(uint8) {
        uint32 pTarifKey = TarifDataLib.tarifKey(_pTarif);
        uint32 cTarifKey = TarifDataLib.tarifKey(_cTarif);

        uint32 key = pTarifKey | (cTarifKey << 16);
        return inviteMatix[key];
    }

    uint16 public registerPrice;
    /**
        @param _registerPrice in dollars
     */
    function setRegisterPrice(uint16 _registerPrice) public onlyOwner {
        registerPrice = _registerPrice;
    }

    /** 
        Logged payment to address in cents. Appends record to history.
    */
    function makePayment(address _from, address _to, uint32 _cent) internal {
        usersTarifsStore.makePayment(_from, _to, _cent);
    }

    function canProcessComsa(address _client) public view returns(bool){
        BuyHistoryRec memory buy = usersFinance.getLastBuy(_client);
        if (buy.tarif == 0 || TarifDataLib.isRejected(buy.tarif)) return false;

        return usersFinance.comsaExists(_client);
    }

    // --- Payment schemes section
    function processComsa(address _client) internal {
        // require(canProcessComsa(_client), "Cant process");
        address mentor = usersTree.getMentor(_client);
        BuyHistoryRec memory buy = usersFinance.getLastBuy(msg.sender);

        uint256 _tarif = buy.tarif;
        uint16 count = TarifDataLib.isPartner(_tarif) ? usersTarifsStore.getLevel(_client) : 1;
        uint32 basePriceCent = count * TarifDataLib.getPrice(_tarif) * 100;

        if (mentor == cWallet) {
            makePayment(_client, cWallet, basePriceCent);
            usersFinance.setComsaExists(msg.sender, false);
            return;
        }

        uint32 curPriceCent = basePriceCent;
        usersTarifsStore.useFill(mentor); //, TarifUsageLib.useFill(usersTarifsStore.getUsage(mentor)));        

        // Invite bonus processing
        if (usersTarifsStore.isPartnerActive(mentor)){
            uint8 invitePercent;
            bool takeInviteBonus = false;
            if (TarifDataLib.isPartner(_tarif)){
                if (!usersTarifsStore.hasPInviteBonus(_client)){
                    usersTarifsStore.givePInviteBonus(_client);
                    takeInviteBonus = true;
                }
            }
            else {
                if (!usersTarifsStore.hasCInviteBonus(_client)){
                    usersTarifsStore.giveCInviteBonus(_client);
                    takeInviteBonus = true;
                }                 
            }
            if (takeInviteBonus){
                invitePercent = getInvitePercent(usersTarifsStore.pTarif(mentor), _tarif);
                require(invitePercent > 0);
                makePayment(_client, mentor, invitePercent * basePriceCent / 100);
                curPriceCent -= invitePercent * basePriceCent / 100;
            }            
        }

        // Quarterly bonus (5%) 
        makePayment(_client, qWallet, basePriceCent * 5 / 100);
        curPriceCent -= basePriceCent * 5 / 100;

        // CWallet comission (30%)
        makePayment(_client, cWallet, basePriceCent * 30 / 100);
        curPriceCent -= basePriceCent * 30 / 100;

        // --- Matrix bonus get first available person
        {
            address mbMen = mentor;
            while (mbMen != address(0) && mbMen != cWallet && !(usersTarifsStore.isPartnerActive(mbMen) && (mbMen == mentor  || usersTarifsStore.hasCompress(mbMen)) && usersTarifsStore.hasSlot(mbMen))){
                mbMen = usersTree.getMentor(mbMen);
            }

            if (mbMen != address(0) && mbMen != cWallet) {
            // if (isPartnerActive(mentor) && hasSlot(UsersTarifsStore.pTarifs[mentor].tarif, UsersTarifsStore.users[mentor].partnerTarifUsage)){
                uint32 matrixCent = TarifDataLib.getMatrixBonus(usersTarifsStore.pTarif(mbMen)) * 100;
                makePayment(_client, mbMen, matrixCent);                
                usersTarifsStore.useSlot(mbMen);
                curPriceCent -= matrixCent;
            }
        }

        uint32 lvCent = curPriceCent / 4;

        // LV logic
        for (uint16 i = 0; i < 4; i++){
            // MC logic
            uint256 pt = usersTarifsStore.pTarif(mentor);

            while (mentor != address(0) && mentor != cWallet && !(TarifDataLib.getLV(pt) > i && usersTarifsStore.isPartnerActive(mentor) && usersTarifsStore.hasLVSlot(mentor) )){
                mentor = usersTree.getMentor(mentor);
                pt = usersTarifsStore.pTarif(mentor);
            }

            if (mentor == cWallet || mentor == address(0)){
                break;
            }
            else{
                makePayment(_client, mentor, lvCent);
                usersTarifsStore.useLVSlot(mentor);
                curPriceCent -= lvCent;
                mentor = usersTree.getMentor(mentor);
            }
        }

        makePayment(_client, mWallet, curPriceCent);
        usersFinance.setComsaExists(msg.sender, false);
    }

    // --- Shop section (buy this, buy that)

    function regitsterPartner() public {
        require(usersTarifsStore.canRegister(msg.sender));      
        usersFinance.freezeMoney(registerPrice, msg.sender);  
        makePayment(msg.sender, cWallet, registerPrice * 100);
        usersTarifsStore.newPartnerTarif(msg.sender, REGISTRATION_KEY, 1, 1);
        usersTarifsStore.register(msg.sender);
    }

    function buyClientTarif(uint256 _tarif) public {
        require(usersTarifsStore.cTarifExists(_tarif) && usersTree.getMentor(msg.sender) != address(0), "E117");
        usersFinance.freezeMoney(TarifDataLib.getPrice(_tarif), msg.sender);
        usersTarifsStore.newClientTarif(msg.sender, _tarif);        
        processComsa(msg.sender);
    }

    function canBuy(address _acc) public view returns (bool) {
        BuyHistoryRec memory buy = usersFinance.getLastBuy(_acc);
        return !TarifDataLib.isPartner(buy.tarif) || buy.rejected || (block.timestamp - buy.timestamp > 48 * 3600);
    }

    function buyPartnerTarif(uint256 _tarif) public {
        require(
            usersTarifsStore.registered(msg.sender)
            && usersTarifsStore.hasActiveMaxClientTarif(msg.sender)
            && usersTarifsStore.isPartnerFullfilled(msg.sender)
            && canBuy(msg.sender), "AAA");

        // require(usersTarifsStore.canBuyPTarif(msg.sender)); // && (block.timestamp - usersFinance.lastBuyTime(msg.sender) > 48 * 3600));

        uint16 buyCount = 1;
        uint16 level = 1;

        if (usersTarifsStore.isPartnerTarifActive(msg.sender)){
            require(usersTarifsStore.isT1BetterOrSameT2(_tarif, usersTarifsStore.pTarif(msg.sender)));

            buyCount = usersTarifsStore.getLevel(msg.sender);
            if (TarifDataLib.tarifKey(usersTarifsStore.pTarif(msg.sender)) == TarifDataLib.tarifKey(_tarif)){
                level = buyCount + 1;
                buyCount = 1;                
            }
            else
                level = buyCount;
        }

        usersFinance.freezeMoney(TarifDataLib.getPrice(_tarif) * buyCount, msg.sender);

        // Если предыдущую комсу не забрали, заберем ее.
        if (usersFinance.comsaExists(msg.sender)){
            processComsa(msg.sender);
        }

        // Если есть невзятая комиссия, то забрать ее. Иначе просто запомнить текущий платеж.
        usersTarifsStore.newPartnerTarif(msg.sender, _tarif, buyCount, level);

        // UsersTarifsStore.getLastBuyTime(_acc);
        // freezeMoney(TarifDataLib.getPrice(_tarif) * buyCount);
        // UsersTarifsStore.setLastBuyTime(msg.sender, block.timestamp);
        
        // uint64 usage = UsersTarifsStore.getUsage(msg.sender);
        // UsersTarifsStore.setUsage(msg.sender, TarifUsageLib.buildUsage(TarifUsageLib.getUsedSlots(usage), TarifUsageLib.getUsedLVSlots(usage), ext, 0));
    }
}
