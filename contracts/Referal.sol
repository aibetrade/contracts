// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./MultyOwner.sol";
import "./ERC20Token.sol";
import "./UsersTarifsStore.sol";
import "./UsersTreeStore.sol";
import "./UsersFinanceStore.sol";
import "./RankMatrix.sol";

contract Referal is MultyOwner {
    UsersTarifsStore public usersTarifsStore;
    UsersFinanceStore public usersFinance;
    UsersTreeStore public usersTree;
    mapping(address => uint256) public passwords;
    RankMatrix public rankMatrix;

    ERC20Token public erc20;

    constructor(address _usersTarifsStoreAddress, address _usersTreeAddress) {
        // erc20 = ERC20Token(_erc20);
        usersTarifsStore = UsersTarifsStore(_usersTarifsStoreAddress);
        usersFinance = UsersFinanceStore(usersTarifsStore.usersFinance());
        usersTree = UsersTreeStore(_usersTreeAddress);
        erc20 = ERC20Token(usersFinance.erc20());

        rankMatrix = new RankMatrix();
        rankMatrix.appendOwner(msg.sender);
    }

    function setPassword(uint256 _password) public{
        passwords[msg.sender] = _password;
    }    

    address public cWallet;
    function setCWallet(address _cWallet) public onlyOwner {
        require(_cWallet != address(0));
        cWallet = _cWallet;
    }

    address public qcWallet;
    function setQCWallet(address _qcWallet) public onlyOwner {
        require(_qcWallet != address(0));
        qcWallet = _qcWallet;
    }

    address public qpWallet;
    function setQPWallet(address _qpWallet) public onlyOwner {
        require(_qpWallet != address(0));
        qpWallet = _qpWallet;
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

    // /** 
    //     Logged payment to address in cents. Appends record to history.
    // */
    // function makePayment(address _from, address _to, uint64 _cent) internal {
    //     usersFinance.makePayment(_from, _to, _cent);
    // }

    function canTakeComsa(address _client) public view returns(bool){        
        BuyHistoryRec memory buy = usersFinance.getLastBuy(_client);
        if (buy.tarif == 0 || buy.rejected) return false;

        return usersFinance.comsaExists(_client);
    }

    function takeComsa(address _client) public {
        require(canTakeComsa(_client));
        processComsa(_client);
    }

    function clientScheme(address _client, address mentor, uint32 curPriceCent) internal returns(uint32){
        // --- Matrix bonus get first available person
        {
            address mbMen = mentor;
            while (mbMen != address(0) && mbMen != address(1) && !(usersTarifsStore.isPartnerActive(mbMen) && (mbMen == mentor  || usersTarifsStore.hasCompress(mbMen)) && usersTarifsStore.hasSlot(mbMen))){
                mbMen = usersTree.getMentor(mbMen);
            }

            if (mbMen != address(0) && mbMen != address(1)) {
                uint32 matrixCent = TarifDataLib.getComsa(usersTarifsStore.pTarif(mbMen)) * 100;
                usersFinance.makePayment(_client, mbMen, matrixCent, PAY_CODE_CLI_MATRIX);                
                usersTarifsStore.useSlot(mbMen);
                curPriceCent -= matrixCent;
            }
        }

        // --- LV bonus logic
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
                usersFinance.makePayment(_client, mentor, lvCent, PAY_CODE_CLI_LV);
                usersTarifsStore.useLVSlot(mentor);
                curPriceCent -= lvCent;
                mentor = usersTree.getMentor(mentor);
            }
        }       

        return curPriceCent;
    }

    function partnerScheme(address _client, address mentor, uint32 curPriceCent) internal returns(uint32){
        uint8 ni = rankMatrix.maxLevel();

        uint32 basePriceCent = curPriceCent;

        for (uint8 i = 0; i < ni; i++){
            if (mentor == address(1) || mentor == address(0) || basePriceCent == 0){
                break;
            }

            uint8 mentorRank = usersTarifsStore.ranks(mentor);
            uint8 perc = rankMatrix.matrix(rankMatrix.toKey(mentorRank, i + 1));

            uint32 lvCent = basePriceCent * perc / 100;
            usersFinance.makePayment(_client, mentor, lvCent, PAY_CODE_PAR_RANK);
            curPriceCent -= lvCent;
            mentor = usersTree.getMentor(mentor);
        }       

        return curPriceCent;        
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
        bool isPartner = TarifDataLib.isPartner(_tarif);

        // Invite bonus processing
        if (usersTarifsStore.isPartnerActive(mentor)){
            uint32 invitePercent;
            bool takeInviteBonus = false;
            if (isPartner){
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
                usersFinance.makePayment(_client, mentor, invitePercent * basePriceCent / 100, isPartner ? PAY_CODE_INVITE_PAR : PAY_CODE_INVITE_CLI);
                curPriceCent -= invitePercent * basePriceCent / 100;
            }            
        }

        // CWallet comission (30%)
        usersFinance.makePayment(_client, cWallet, basePriceCent * 30 / 100, PAY_CODE_COMPANY);
        curPriceCent -= basePriceCent * 30 / 100;

        if (isPartner){
            // Quarterly bonus (5%) 
            usersFinance.makePayment(_client, qpWallet, basePriceCent * 5 / 100, PAY_CODE_QUART_PAR);
            curPriceCent -= basePriceCent * 5 / 100;

            curPriceCent = partnerScheme(_client, mentor, curPriceCent);
        }
        else {
            // Quarterly bonus (5%) 
            usersFinance.makePayment(_client, qcWallet, basePriceCent * 5 / 100, PAY_CODE_QUART_CLI);
            curPriceCent -= basePriceCent * 5 / 100;

            curPriceCent = clientScheme(_client, mentor, curPriceCent);
        }

        usersFinance.makePayment(_client, mWallet, curPriceCent, PAY_CODE_MAGIC);
        usersFinance.setComsaExists(_client, false);
    }

    // --- Shop section (buy this, buy that)

    function regitsterPartner() public {
        require(usersTarifsStore.canRegister(msg.sender));      
        usersFinance.freezeMoney(registerPrice, msg.sender);  
        usersFinance.makePayment(msg.sender, cWallet, registerPrice * 100, PAY_CODE_REGISTER);
        usersTarifsStore.newPartnerTarif(msg.sender, REGISTRATION_KEY, 1, 1);
        usersTarifsStore.register(msg.sender);
    }

    function canBuy(address _acc) public view returns (bool) {
        if (usersTree.blockedUsers(_acc) || usersTree.getMentor(_acc) == address(0)) return false;
        BuyHistoryRec memory buy = usersFinance.getLastBuy(_acc);
        return !TarifDataLib.isPartner(buy.tarif) || buy.rejected || (block.timestamp - buy.timestamp > 48 * 3600);
    }

    function buyClientTarif(uint16 _tarifKey) public {
        require(!usersTree.blockedUsers(msg.sender), "User blocked");

        TarifsStoreBase clientTarifs = usersTarifsStore.clientTarifs();
        uint256 tarif = clientTarifs.tarif(_tarifKey);
        require(tarif != 0 && canBuy(msg.sender), "E117");

        // Если предыдущую комсу не забрали, заберем ее.
        if (usersFinance.comsaExists(msg.sender)) processComsa(msg.sender);

        usersFinance.freezeMoney(TarifDataLib.getPrice(tarif), msg.sender);
        usersTarifsStore.newClientTarif(msg.sender, tarif);        
        processComsa(msg.sender);
    }

    function buyPartnerTarif(uint16 _tarifKey) public {
        TarifsStoreBase partnerTarifs = usersTarifsStore.partnerTarifs();
        uint256 tarif = partnerTarifs.tarif(_tarifKey);

        require(
            usersTarifsStore.registered(msg.sender)
            && usersTarifsStore.hasActiveMaxClientTarif(msg.sender)
            && usersTarifsStore.isPartnerFullfilled(msg.sender)
            && canBuy(msg.sender), "E118");

        // Если предыдущую комсу не забрали, заберем ее.
        if (usersFinance.comsaExists(msg.sender)) processComsa(msg.sender);

        uint16 buyCount = usersTarifsStore.getNextBuyCount(msg.sender, _tarifKey);
        uint16 level = usersTarifsStore.getNextLevel(msg.sender, _tarifKey);

        require(buyCount > 0, "Noting to buy");

        // if (usersTarifsStore.isPartnerTarifActive(msg.sender)){
        //     require(usersTarifsStore.isT1BetterOrSameT2(_tarifKey, TarifDataLib.tarifKey(usersTarifsStore.pTarif(msg.sender))));

        //     buyCount = usersTarifsStore.getLevel(msg.sender);
        //     if (TarifDataLib.tarifKey(usersTarifsStore.pTarif(msg.sender)) == _tarifKey){
        //         level = buyCount + 1;
        //         buyCount = 1;                
        //     }
        //     else
        //         level = buyCount;
        // }

        if (partnerTarifs.isLast(_tarifKey) && usersTarifsStore.ranks(msg.sender) < 3){
            usersTarifsStore.adminSetRank(msg.sender, 3);
        }

        usersFinance.freezeMoney(TarifDataLib.getPrice(tarif) * buyCount, msg.sender);

        // Если есть невзятая комиссия, то забрать ее. Иначе просто запомнить текущий платеж.
        usersTarifsStore.newPartnerTarif(msg.sender, tarif, buyCount, level);
    }
}
