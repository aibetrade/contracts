// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./MultyOwner.sol";
import "./ERC20Token.sol";
import "./UsersTarifsStore.sol";
import "./UsersTreeStore.sol";

contract Referal is MultyOwner {
    UsersTarifsStore public usersTarifsStore;
    UsersFinanceStore public usersFinance;
    UsersTreeStore public usersTree;
    mapping(address => uint256) public passwords;

    ERC20Token public erc20;

    constructor(address _usersTarifsStoreAddress, address _usersTreeAddress) {
        // erc20 = ERC20Token(_erc20);
        usersTarifsStore = UsersTarifsStore(_usersTarifsStoreAddress);
        usersFinance = UsersFinanceStore(usersTarifsStore.usersFinance());
        usersTree = UsersTreeStore(_usersTreeAddress);
        erc20 = ERC20Token(usersFinance.erc20());
    }

    function setPassword(uint256 _password) public{
        passwords[msg.sender] = _password;
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

    function getInvitePercent(uint16 _pTarifKey, uint16 _cTarifKey) public view returns(uint8) {
        uint32 key = (uint32(_pTarifKey) << 16) | _cTarifKey;
        return inviteMatix[key];
    }

    function setInviteMatrix(uint32[] memory keys, uint8[] memory percs) public onlyOwner {
        require(keys.length == percs.length);
        for (uint8 i = 0; i < keys.length; i++){
            inviteMatix[keys[i]] = percs[i];
        }
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
    function makePayment(address _from, address _to, uint64 _cent) internal {
        usersFinance.makePayment(_from, _to, _cent);
    }

    function canTakeComsa(address _client) public view returns(bool){        
        BuyHistoryRec memory buy = usersFinance.getLastBuy(_client);
        if (buy.tarif == 0 || buy.rejected) return false;

        return usersFinance.comsaExists(_client);
    }

    function takeComsa(address _client) public {
        require(canTakeComsa(_client));
        processComsa(_client);
    }

    // --- Payment schemes section
    function processComsa(address _client) internal {
        // require(canTakeComsa(_client), "Cant process");
        address mentor = usersTree.getMentor(_client);
        if (mentor == address(1)) mentor = cWallet;        
        
        BuyHistoryRec memory buy = usersFinance.getLastBuy(_client);

        uint256 _tarif = buy.tarif;
        uint32 basePriceCent = uint32(buy.count) * TarifDataLib.getPrice(_tarif) * 100;        

        uint32 curPriceCent = basePriceCent;
        usersTarifsStore.useFill(mentor);

        // Invite bonus processing
        if (usersTarifsStore.isPartnerActive(mentor)){
            uint32 invitePercent;
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
                invitePercent = getInvitePercent(TarifDataLib.tarifKey(usersTarifsStore.pTarif(mentor)), TarifDataLib.tarifKey(_tarif));
                require(invitePercent > 0, "IP is 0");
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
            while (mbMen != address(0) && mbMen != address(1) && !(usersTarifsStore.isPartnerActive(mbMen) && (mbMen == mentor  || usersTarifsStore.hasCompress(mbMen)) && usersTarifsStore.hasSlot(mbMen))){
                mbMen = usersTree.getMentor(mbMen);
            }

            if (mbMen != address(0) && mbMen != address(1)) {
            // if (isPartnerActive(mentor) && hasSlot(UsersTarifsStore.pTarifs[mentor].tarif, UsersTarifsStore.users[mentor].partnerTarifUsage)){
                uint32 matrixCent = TarifDataLib.getComsa(usersTarifsStore.pTarif(mbMen)) * 100;
                makePayment(_client, mbMen, matrixCent);                
                usersTarifsStore.useSlot(mbMen);
                curPriceCent -= matrixCent;
            }
        }

        // LV logic
        uint32 lvCent = curPriceCent / 4;
        for (uint8 i = 0; i < 4; i++){
            // MC logic
            uint256 pt = usersTarifsStore.pTarif(mentor);

            while (mentor != address(0) && mentor != address(1) && !(TarifDataLib.getLV(pt) > i && usersTarifsStore.isPartnerActive(mentor) && usersTarifsStore.hasLVSlot(mentor) )){
                mentor = usersTree.getMentor(mentor);
                pt = usersTarifsStore.pTarif(mentor);
            }

            if (mentor == address(1) || mentor == address(0)){
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
        usersFinance.setComsaExists(_client, false);
    }

    // --- Shop section (buy this, buy that)

    function regitsterPartner() public {
        require(usersTarifsStore.canRegister(msg.sender));      
        usersFinance.freezeMoney(registerPrice, msg.sender);  
        makePayment(msg.sender, cWallet, registerPrice * 100);
        usersTarifsStore.newPartnerTarif(msg.sender, REGISTRATION_KEY, 1, 1);
        usersTarifsStore.register(msg.sender);
    }

    function canBuy(address _acc) public view returns (bool) {
        if (usersTree.getMentor(msg.sender) == address(0)) return false;
        BuyHistoryRec memory buy = usersFinance.getLastBuy(_acc);
        return !TarifDataLib.isPartner(buy.tarif) || buy.rejected || (block.timestamp - buy.timestamp > 48 * 3600);
    }

    function buyClientTarif(uint256 _tarif) public {
        require(usersTarifsStore.cTarifExists(_tarif) && canBuy(msg.sender), "E117");

        // Если предыдущую комсу не забрали, заберем ее.
        if (usersFinance.comsaExists(msg.sender)) processComsa(msg.sender);

        usersFinance.freezeMoney(TarifDataLib.getPrice(_tarif), msg.sender);
        usersTarifsStore.newClientTarif(msg.sender, _tarif);        
        processComsa(msg.sender);
    }

    function buyPartnerTarif(uint256 _tarif) public {
        require(
            usersTarifsStore.registered(msg.sender)
            && usersTarifsStore.hasActiveMaxClientTarif(msg.sender)
            && usersTarifsStore.isPartnerFullfilled(msg.sender)
            && canBuy(msg.sender), "E118");

        // Если предыдущую комсу не забрали, заберем ее.
        if (usersFinance.comsaExists(msg.sender)) processComsa(msg.sender);

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

        // Если есть невзятая комиссия, то забрать ее. Иначе просто запомнить текущий платеж.
        usersTarifsStore.newPartnerTarif(msg.sender, _tarif, buyCount, level);
    }
}
