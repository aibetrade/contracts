// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./OnlyOwner.sol";
import "./ERC20Token.sol";
import "./User.sol";

contract Referal is UsersStore {
    ERC20Token public erc20;

    address public cWallet;
    function setCWallet(address _cWallet) public onlyOwner {
        require(_cWallet != address(0));
        cWallet = _cWallet;
    }

    address public mWallet;
    function setMWallet(address _mWallet) public onlyOwner {
        require(_mWallet != address(0));
        mWallet = _mWallet;
    }

    constructor(address _erc20, address _cWallet, uint8 _qBonus, address _qWallet, address _mWallet) {
        erc20 = ERC20Token(_erc20);
        setCWallet(_cWallet);        
        setQBonus(_qBonus);
        setQWallet(_qWallet);
        setMWallet(_mWallet);
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

        uint32 pTarifKey = tarifKey(_pTarif);
        uint32 cTarifKey = tarifKey(_cTarif);

        uint32 key = pTarifKey | (cTarifKey << 16);
        inviteMatix[key] = _percent;
    }

    function getInvitePercent(uint256 _pTarif, uint256 _cTarif) public view returns(uint8) {
        uint32 pTarifKey = tarifKey(_pTarif);
        uint32 cTarifKey = tarifKey(_cTarif);

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

    uint16 public qBonus;
    /**
        @param _qBonus in percent
     */
    function setQBonus(uint8 _qBonus) public onlyOwner {
        require(_qBonus < 101);
        qBonus = _qBonus;
    }

    address public qWallet;
    function setQWallet(address _qWallet) public onlyOwner{
        qWallet = _qWallet;
    }

    function centToErc20(uint256 _cents) public view returns (uint256){
        return _cents * (10 ** (erc20.decimals() - 2));
    }

    /** 
        Logged payment to address in cents. Appends record to history.
    */
    function makePayment(address _to, uint32 _cent) internal {
        erc20.transfer(_to, centToErc20(_cent));
        users[_to].payHistory.push(PayHistoryRec({timestamp: block.timestamp, cents: _cent, from: msg.sender}));
    }

    // --- is/has section
    function hasActiveMaxClientTarif(address user) public view returns (bool) {
        return isClientTarifActive(user) && clientTarifs.isLast(cTarifs[user].tarif);
    }

    function isPartnerActive(address _partner) public view returns(bool){
        return hasActiveMaxClientTarif(_partner) && isPartnerTarifActive(_partner);
    }

    function isPartnerFullfilled(address _partner) public view returns (bool) {
        return getFilled(users[_partner].partnerTarifUsage) >= getFullNum(pTarifs[_partner].tarif);
    }

    // --- Rejectable section
    // Always reject only last buy (in history)
    function reject() public {
        BuyHistoryRec memory bhr = users[msg.sender].buyHistory[users[msg.sender].buyHistory.length - 1];

        require(!getIsRejected(bhr.tarif) 
            && block.timestamp - bhr.timestamp <= 48 * 3600);
        
        uint16 price = getPrice(bhr.tarif);
        uint16 count = bhr.count;
        erc20.transfer(bhr.from, centToErc20(price * 100 * count));

        rejectBuy(users[msg.sender].buyHistory.length - 1);
    }

    function takeComsa(address _client, uint256 _buyIndex) public {
        require(!getIsRejected(users[_client].buyHistory[_buyIndex].tarif) 
            && !getIsComsaTaken(users[_client].buyHistory[_buyIndex].tarif)
            && block.timestamp - users[_client].buyHistory[_buyIndex].timestamp > 48 * 3600);

        uint256 tar = users[_client].buyHistory[_buyIndex].tarif;

        if (tarifKey(tar) == REGISTRATION_KEY){
        }

        else if (isPartner(tar)){
            partnerScheme(tar, _client);
        }

        else {
            clientScheme(tar, _client);
        }

        users[_client].buyHistory[_buyIndex].tarif = setComsaTaken(tar);
    }

    function freezeMoney(uint32 dollar) private{
        require(block.timestamp - users[msg.sender].lastBuyAt > 48 * 3600);
        erc20.transferFrom(msg.sender, address(this), centToErc20(dollar * 100));
        users[msg.sender].lastBuyAt = block.timestamp;
    }

    // --- Payment schemes section
    function clientScheme(uint256 _tarif, address _client) internal {
        if (users[_client].mentor == cWallet) {
            makePayment(cWallet, getPrice(_tarif) * 100);
            return;
        }

        address mentor = users[_client].mentor;
        uint16 count = isPartner(_tarif) ? getExtLevel(users[_client].partnerTarifUsage) : 1;
        uint32 basePriceCent = count * getPrice(_tarif) * 100;
        uint32 curPriceCent = basePriceCent;
        users[mentor].partnerTarifUsage = useFill(users[mentor].partnerTarifUsage);
        

        // Invite bonus processing
        if (isPartnerActive(mentor)){
            uint8 invitePercent;
            bool takeInviteBonus = false;
            if (isPartner(_tarif)){
                if (!pTarifs[_client].gotInviteBonus){
                    pTarifs[_client].gotInviteBonus = true;
                    takeInviteBonus = true;
                }
            }
            else {
                if (!cTarifs[_client].gotInviteBonus){
                    cTarifs[_client].gotInviteBonus = true;
                    takeInviteBonus = true;
                }                 
            }
            if (takeInviteBonus){
                invitePercent = getInvitePercent(pTarifs[mentor].tarif, _tarif);
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
            while (mbMen != address(0) && mbMen != cWallet && !(isPartnerActive(mbMen) && (mbMen == mentor  || hasCompress(pTarifs[mbMen].tarif)) && hasSlot(pTarifs[mbMen].tarif, users[mbMen].partnerTarifUsage))){
                mbMen = users[mbMen].mentor;
            }

            if (mbMen != address(0) && mbMen != cWallet) {
            // if (isPartnerActive(mentor) && hasSlot(pTarifs[mentor].tarif, users[mentor].partnerTarifUsage)){
                uint32 matrixCent = getMatrixBonus(pTarifs[mbMen].tarif) * 100;
                makePayment(mbMen, matrixCent);
                users[mbMen].partnerTarifUsage = useSlot(users[mbMen].partnerTarifUsage);
                curPriceCent -= matrixCent;
            }
        }

        uint32 lvCent = curPriceCent / 4;

        // LV logic
        for (uint16 i = 0; i < 4; i++){
            // MC logic
            uint256 pt = pTarifs[mentor].tarif;
            uint64 ptu = users[mentor].partnerTarifUsage;

            while (mentor != address(0) && mentor != cWallet && !(getLV(pt) > i && isPartnerActive(mentor) && hasLVSlot(pt, ptu) )){
                mentor = users[mentor].mentor;
                pt = pTarifs[mentor].tarif;
                ptu = users[mentor].partnerTarifUsage;
            }

            if (mentor == cWallet || mentor == address(0)){
                break;
            }
            else{
                makePayment(mentor, lvCent);
                users[mentor].partnerTarifUsage = useLVSlot(users[mentor].partnerTarifUsage);
                curPriceCent -= lvCent;
                mentor = users[mentor].mentor;
            }
        }

        makePayment(mWallet, curPriceCent);
    }

    

    function partnerScheme(uint256 _tarif, address _client) internal {
        clientScheme(_tarif, _client);
    }

    // --- Shop section (buy this, buy that)

    function regitsterPartner() public {
        require(hasActiveMaxClientTarif(msg.sender) && !users[msg.sender].registered); // , "Not MaxCli or already reg"        
        
        freezeMoney(registerPrice);

        newPartnerTarif(REGISTRATION_KEY, 1);

        users[msg.sender].registered = true;
    }

    function buyClientTarif(uint256 _tarif) public {
        require(clientTarifs.exists(_tarif) && users[msg.sender].mentor != address(0)); // , "NoMen or NoExTar"
        // require(clientTarifs.exists(_tarif), "Mentor or non exists tarif");

        freezeMoney(getPrice(_tarif));

        newClientTarif(_tarif);
    }

    event AAA(uint256 count);

    function buyPartnerTarif(uint256 _tarif) public {
        require(users[msg.sender].registered && hasActiveMaxClientTarif(msg.sender) && isPartnerFullfilled(msg.sender));

        uint16 buyCount = 1;
        uint16 ext = 1;

        if (isPartnerTarifActive(msg.sender)){
            require(isT1BetterOrSameT2(_tarif, pTarifs[msg.sender].tarif));

            buyCount = getExtLevel(users[msg.sender].partnerTarifUsage);
            if (tarifKey(pTarifs[msg.sender].tarif) == tarifKey(_tarif)){
                ext = buyCount + 1;
                buyCount = 1;                
            }
            else
                ext = buyCount;
        }

        freezeMoney(getPrice(_tarif) * buyCount);

        newPartnerTarif(_tarif, buyCount);

        uint64 usage = users[msg.sender].partnerTarifUsage;
        users[msg.sender].partnerTarifUsage = buildUsage(getUsedSlots(users[msg.sender].partnerTarifUsage), getUsedLVSlots(usage), ext, 0);
    }
}
