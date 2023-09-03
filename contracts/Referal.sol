// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./OnlyOwner.sol";
import "./ERC20Token.sol";
import "./User.sol";

contract Referal is OnlyOwner {
    ERC20Token public erc20;

    UsersStore public usersStore;

    constructor(address _erc20, address _usersStoreAddress) {
        erc20 = ERC20Token(_erc20);
        usersStore = UsersStore(_usersStoreAddress);
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

    function centToErc20(uint256 _cents) public view returns (uint256){
        return _cents * (10 ** (erc20.decimals() - 2));
    }

    /** 
        Logged payment to address in cents. Appends record to history.
    */
    function makePayment(address _to, uint32 _cent) internal {
        erc20.transfer(_to, centToErc20(_cent));
        // {timestamp: block.timestamp, cents: _cent, from: msg.sender}
        // UserStruct memory ss = usersStore.getUser(_to);
        // ss.payHistory.push(PayHistoryRec({timestamp: block.timestamp, cents: _cent, from: msg.sender}));
        usersStore.addUserPay(_to, PayHistoryRec({timestamp: block.timestamp, cents: _cent, from: msg.sender}));
    }

    // // --- is/has section
    // function hasActiveMaxClientTarif(address user) public view returns (bool) {
    //     return usersStore.isClientTarifActive(user) && usersStore.clientTarifs.isLast(usersStore.cTarifs(user).tarif);
    // }

    // function isPartnerActive(address _partner) public view returns(bool){
    //     return hasActiveMaxClientTarif(_partner) && usersStore.isPartnerTarifActive(_partner);
    // }

    // function isPartnerFullfilled(address _partner) public view returns (bool) {
    //     return TarifUsageLib.getFilled(usersStore.users[_partner].partnerTarifUsage) >= TarifDataLib.getFullNum(usersStore.pTarifs[_partner].tarif);
    // }

    // --- Rejectable section
    // Always reject only last buy (in history)
    function reject() public {
        require(usersStore.canReject(msg.sender));
        BuyHistoryRec memory bhr = usersStore.getLastPay(msg.sender);

        // require(!TarifDataLib.getIsRejected(bhr.tarif)  && block.timestamp - bhr.timestamp <= 48 * 3600);
        
        uint16 price = TarifDataLib.getPrice(bhr.tarif);
        uint16 count = bhr.count;
        erc20.transfer(bhr.from, centToErc20(price * 100 * count));

        usersStore.rejectBuy(msg.sender);
    }

    function takeComsa(address _client, uint256 _buyIndex) public {
        require(usersStore.isPayFixed(_client, _buyIndex));
        //  !TarifDataLib.getIsRejected(usersStore.users[_client].buyHistory[_buyIndex].tarif) 
        //     && !TarifDataLib.getIsComsaTaken(usersStore.users[_client].buyHistory[_buyIndex].tarif)
        //     && block.timestamp - usersStore.users[_client].buyHistory[_buyIndex].timestamp > 48 * 3600);

        // uint256 tar = usersStore.users[_client].buyHistory[_buyIndex].tarif;
        uint256 tar = usersStore.getPayTarif(_client, _buyIndex);

        if (TarifDataLib.tarifKey(tar) == REGISTRATION_KEY){
        }

        // else if (isPartner(tar)){
        //     partnerScheme(tar, _client);
        // }

        else {
            clientScheme(tar, _client);
        }

        usersStore.setComsaTaken(_client, _buyIndex); //users[_client].buyHistory[_buyIndex].tarif = TarifDataLib.setComsaTaken(tar);
    }

    function freezeMoney(uint32 dollar) private{
        require(usersStore.canFreezeMoney(msg.sender));
        erc20.transferFrom(msg.sender, address(this), centToErc20(dollar * 100));
        usersStore.setLastBuyTime(msg.sender, block.timestamp);
    }

    // --- Payment schemes section
    function clientScheme(uint256 _tarif, address _client) internal {
        address mentor = usersStore.getMentor(_client);

        if (mentor == cWallet) {
            makePayment(cWallet, TarifDataLib.getPrice(_tarif) * 100);
            return;
        }

        uint16 count = TarifDataLib.isPartner(_tarif) ? TarifUsageLib.getExtLevel(usersStore.getUsage(_client)) : 1;
        uint32 basePriceCent = count * TarifDataLib.getPrice(_tarif) * 100;
        uint32 curPriceCent = basePriceCent;
        usersStore.setUsage(mentor, TarifUsageLib.useFill(usersStore.getUsage(mentor)));
        

        // Invite bonus processing
        if (usersStore.isPartnerActive(mentor)){
            uint8 invitePercent;
            bool takeInviteBonus = false;
            if (TarifDataLib.isPartner(_tarif)){
                if (!usersStore.hasPInviteBonus(_client)){
                    usersStore.givePInviteBonus(_client);
                    takeInviteBonus = true;
                }
            }
            else {
                if (!usersStore.hasCInviteBonus(_client)){
                    usersStore.giveCInviteBonus(_client);
                    takeInviteBonus = true;
                }                 
            }
            if (takeInviteBonus){
                invitePercent = getInvitePercent(usersStore.pTarif(mentor), _tarif);
                require(invitePercent > 0);
                makePayment(mentor, invitePercent * basePriceCent / 100);
                curPriceCent -= invitePercent * basePriceCent / 100;
            }
            
        }

        // Quarterly bonus (5%) 
        makePayment(qWallet, basePriceCent * 5 / 100);
        curPriceCent -= basePriceCent * 5 / 100;

        // CWallet comission (30%)
        makePayment(cWallet, basePriceCent * 30 / 100);
        curPriceCent -= basePriceCent * 30 / 100;

        // --- Matrix bonus get first available person
        {
            address mbMen = mentor;
            while (mbMen != address(0) && mbMen != cWallet && !(usersStore.isPartnerActive(mbMen) && (mbMen == mentor  || usersStore.hasCompress(mbMen)) && usersStore.hasSlot(mbMen))){
                mbMen = usersStore.getMentor(mbMen);
            }

            if (mbMen != address(0) && mbMen != cWallet) {
            // if (isPartnerActive(mentor) && hasSlot(usersStore.pTarifs[mentor].tarif, usersStore.users[mentor].partnerTarifUsage)){
                uint32 matrixCent = TarifDataLib.getMatrixBonus(usersStore.pTarif(mbMen)) * 100;
                makePayment(mbMen, matrixCent);                
                usersStore.useSlot(mbMen);
                curPriceCent -= matrixCent;
            }
        }

        uint32 lvCent = curPriceCent / 4;

        // LV logic
        for (uint16 i = 0; i < 4; i++){
            // MC logic
            uint256 pt = usersStore.pTarif(mentor);
            // uint64 ptu = usersStore.getUsage(mentor);

            while (mentor != address(0) && mentor != cWallet && !(TarifDataLib.getLV(pt) > i && usersStore.isPartnerActive(mentor) && usersStore.hasLVSlot(mentor) )){
                mentor = usersStore.getMentor(mentor);
                pt = usersStore.pTarif(mentor);
                // ptu = usersStore.users[mentor].partnerTarifUsage;
            }

            if (mentor == cWallet || mentor == address(0)){
                break;
            }
            else{
                makePayment(mentor, lvCent);
                usersStore.useLVSlot(mentor);
                curPriceCent -= lvCent;
                mentor = usersStore.getMentor(mentor);
            }
        }

        makePayment(mWallet, curPriceCent);
    }

    

    // function partnerScheme(uint256 _tarif, address _client) internal {
    //     clientScheme(_tarif, _client);
    // }

    // --- Shop section (buy this, buy that)

    function regitsterPartner() public {
        require(usersStore.canRegister(msg.sender));
        
        freezeMoney(registerPrice);

        usersStore.newPartnerTarif(msg.sender, REGISTRATION_KEY, 1);

        usersStore.register(msg.sender);
    }

    function buyClientTarif(uint256 _tarif) public {
        require(usersStore.cTarifExists(_tarif) && usersStore.getMentor(msg.sender) != address(0)); // , "NoMen or NoExTar"

        freezeMoney(TarifDataLib.getPrice(_tarif));

        usersStore.newClientTarif(msg.sender, _tarif);
    }

    function buyPartnerTarif(uint256 _tarif) public {
        require(usersStore.canBuyPTarif(msg.sender));

        uint16 buyCount = 1;
        uint16 ext = 1;

        if (usersStore.isPartnerTarifActive(msg.sender)){
            require(usersStore.isT1BetterOrSameT2(_tarif, usersStore.pTarif(msg.sender)));

            buyCount = TarifUsageLib.getExtLevel(usersStore.getUsage(msg.sender));
            if (TarifDataLib.tarifKey(usersStore.pTarif(msg.sender)) == TarifDataLib.tarifKey(_tarif)){
                ext = buyCount + 1;
                buyCount = 1;                
            }
            else
                ext = buyCount;
        }

        freezeMoney(TarifDataLib.getPrice(_tarif) * buyCount);

        usersStore.newPartnerTarif(msg.sender, _tarif, buyCount);

        uint64 usage = usersStore.getUsage(msg.sender);
        usersStore.setUsage(msg.sender, TarifUsageLib.buildUsage(TarifUsageLib.getUsedSlots(usage), TarifUsageLib.getUsedLVSlots(usage), ext, 0));
    }
}
