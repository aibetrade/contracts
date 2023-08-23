// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./OnlyOwner.sol";
import "./ERC20Token.sol";
import "./User.sol";

uint16 constant REGISTRATION_KEY = 65535;

contract Referal is UsersStore, TarifsContract {
    ERC20Token public erc20;

    // TarifsContract tarifsContract;

    address bene;
    function setBene(address _bene) public onlyOwner {
        require(_bene != address(0));
        bene = _bene;
    }

    constructor(address _erc20, address _bene, uint8 _qBonus, address _qWallet) {
        erc20 = ERC20Token(_erc20);
        setBene(_bene);        
        setQBonus(_qBonus);
        setQWallet(_qWallet);
    }

    mapping(uint32 => uint8) public inviteMatix;
    /**
        Set invite percent for partner tarif selling client tarif.
        @param _pTarif parent tarif
        @param _cTarif client tarif (sell from parent)
        @param _percent Invite percent (give once)
     */
    function setInviteMatixRec(uint256 _pTarif, uint256 _cTarif, uint8 _percent) public onlyOwner {
        require(_percent < 101);

        uint16 pTarifKey = tarifKey(_pTarif);
        uint16 cTarifKey = tarifKey(_cTarif);

        uint32 key = pTarifKey & (cTarifKey << 16);
        inviteMatix[key] = _percent;
    }

    function getInvitePercent(uint256 _pTarif, uint256 _cTarif) public view returns(uint8) {
        uint16 pTarifKey = tarifKey(_pTarif);
        uint16 cTarifKey = tarifKey(_cTarif);

        uint32 key = pTarifKey & (cTarifKey << 16);
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
    function makePayment(address _to, uint16 _cent) internal {
        erc20.transferFrom(msg.sender, _to, centToErc20(_cent));
        users[_to].payHistory.push(PayHistoryRec({timestamp: block.timestamp, cents: _cent, from: msg.sender}));
    }

    // --- is/has section
    function hasActiveMaxClientTarif(address user) public view returns (bool) {
        return isClientTarifActive(user) && isLastClientTarif(users[user].clientTarif);
    }

    function isPartnerActive(address _partner) public view returns(bool){
        return hasActiveMaxClientTarif(_partner) && isPartnerTarifActive(_partner);
    }

    function isPartnerFullfilled() public view returns (bool) {
        if (!isPartnerTarifActive(msg.sender)) return true;
        uint64 tu = users[msg.sender].partnerTarifUsage;
        return
            getUsedSlots(tu) ==
            getNumSlots(users[msg.sender].partnerTarif) * (getExtLevel(tu) + 1);
    }

    // --- Rejectable section
    function canReject(address _user, uint256 _buyIndex) public view returns(bool) {        
        require(!getIsRejected(users[_user].buyHistory[_buyIndex].tarif));
        return (block.timestamp - users[_user].buyHistory[_buyIndex].timestamp) <= 48 * 3600;        
    }

    function reject(address _user, uint256 _buyIndex) public{
        require(canReject(_user, _buyIndex));
        
        uint16 priceCent = getPrice(users[_user].buyHistory[_buyIndex].tarif);
        uint16 count = users[_user].buyHistory[_buyIndex].count;
        erc20.transfer(users[_user].buyHistory[_buyIndex].from, centToErc20(priceCent * count));

        uint256 tar = users[_user].buyHistory[_buyIndex].tarif;
        // Reject registration
        if (tarifKey(tar) == REGISTRATION_KEY){
            users[_user].registered = false;
        }
        // Reject parent tarif
        else if (isPartner(tar)){
            users[_user].partnerTarif = users[_user].rollbackTarif;
            users[_user].partnerTarifAt = users[_user].rollbackDate;
            users[_user].partnerTarifUsage = users[_user].rollbackUsage;           
        }
        // Reject client tarif
        else {
            users[_user].clientTarif = users[_user].rollbackTarif;
            users[_user].clientTarifAt = users[_user].rollbackDate;
        }

        users[_user].buyHistory[_buyIndex].tarif = setIsRejected(users[_user].buyHistory[_buyIndex].tarif, true);
        users[_user].lastBuyAt = 0;
    }

    function canTakeComsa(address _user, uint256 _buyIndex) public view returns(bool) {
        require(!getIsRejected(users[_user].buyHistory[_buyIndex].tarif), "Buy rejected");
        require(!getIsComsaTaken(users[_user].buyHistory[_buyIndex].tarif), "Comsa taken");
        return (block.timestamp - users[_user].buyHistory[_buyIndex].timestamp) > 48 * 3600;
    }

    function takeComsa(address _user, uint256 _buyIndex) public{
        require(canTakeComsa(_user, _buyIndex));

        uint256 tar = users[_user].buyHistory[_buyIndex].tarif;

        if (tarifKey(tar) == REGISTRATION_KEY){
        }

        else if (isPartner(tar)){
            partnerScheme(tar, _user);
        }

        else {
            clientScheme(tar, _user);
        }

        users[_user].buyHistory[_buyIndex].tarif = setIsComsaTaken(tar, true);
    }

    // Can buy only if no pendig rejectable tarifs.
    function canBuy(address user) public view returns(bool){                
        return block.timestamp - users[user].lastBuyAt > 48 * 3600;
    }

    function freezeMoney(uint16 dollar) private{
        require(canBuy(msg.sender), "48 hours");
        erc20.transferFrom(msg.sender, address(this), centToErc20(dollar * 100));
    }

    // --- Payment schemes section
    function clientScheme(uint256 _tarif, address _client) internal {
        if (users[_client].mentor == bene || users[_client].mentor == address(0)) {
            makePayment(bene, getPrice(_tarif));
            return;
        }
        
        address mentor = users[_client].mentor;
        uint16 basePriceCent = getPrice(_tarif); 
        uint16 curPriceCent = basePriceCent;

        // Process invite bonus (this is first payment)
        if (users[_client].buyHistory.length == 1 && isPartnerActive(mentor)){
            uint8 invitePercent = getInvitePercent(users[mentor].partnerTarif, users[_client].clientTarif);
            // Send bonus to mentor.
            makePayment(mentor, invitePercent * basePriceCent / 100);
            curPriceCent -= invitePercent * basePriceCent / 100;
        }

        // Quarterly bonus (5%) 
        makePayment(mentor, basePriceCent * 5 / 100);
        curPriceCent -= basePriceCent * 5 / 100;

        // Company comission (30%)
        makePayment(mentor, basePriceCent * 30 / 100);
        curPriceCent -= basePriceCent * 30 / 100;

        // Matrix bonus
        uint16 matrixCent = getMatrixBonus(users[mentor].partnerTarif);
        if (isPartnerActive(mentor)){
            makePayment(mentor, matrixCent);
            curPriceCent -= matrixCent;
        }        

        uint16 lvCent = curPriceCent / 4;

        // LV logic
        mentor = users[msg.sender].mentor;
        for (uint8 i = 0; i < 4; i++){
            // MC logic
            uint256 pt = users[mentor].partnerTarif;
            uint64 ptu = users[mentor].partnerTarifUsage;

            while (mentor != address(0) && mentor != bene && !(hasLVSlot(pt, ptu) && getLV(pt) > i)){
                mentor = users[mentor].mentor;
            }

            if (mentor == bene || mentor == address(0)){
                break;
            }
            else{
                makePayment(mentor, lvCent);
                curPriceCent -= lvCent;
            }
        }

        makePayment(bene, curPriceCent);
    }

    

    function partnerScheme(uint256 _tarif, address _client) internal {
        clientScheme(_tarif, _client);
    }

    // --- Shop section (buy this, buy that)

    function regitsterPartner() public {
        require(hasActiveMaxClientTarif(msg.sender), "Need max client tarif");
        require(users[msg.sender].registered == false, "Already registered");
        
        freezeMoney(registerPrice);

        newPartnerTarif(REGISTRATION_KEY, 1);

        users[msg.sender].registered = true;
    }

    function buyClientTarif(uint256 _tarif) public {
        require(ClientTarifs.exists(_tarif), "Tarif not found");
        require(users[msg.sender].mentor != address(0), "You need mentor");

        freezeMoney(getPrice(_tarif));

        newClientTarif(_tarif);
    }

    function buyPartnerTarif(uint256 _tarif) internal {
        require(users[msg.sender].registered, "Need registration");
        require(hasActiveMaxClientTarif(msg.sender), "Need max client tarif");
        require(isPartnerFullfilled(), "Not fullfilled");

        uint16 count = 1;

        if (isPartnerTarifActive(msg.sender)){
            require(isT1BetterOrSameT2(_tarif, users[msg.sender].partnerTarif), "Downgrade partner tarif is disabled");
            count = getExtLevel(users[msg.sender].partnerTarifUsage);
        }

        freezeMoney(getPrice(_tarif));

        newPartnerTarif(_tarif, count);
    }
}
