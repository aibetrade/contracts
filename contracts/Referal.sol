// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./OnlyOwner.sol";
import "./ERC20Token.sol";
import "./User.sol";

// uint16 constant REGISTRATION_KEY = 65535;

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
        erc20.transfer(_to, centToErc20(_cent));
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
    // Always reject only last buy (in history)
    function reject() public {
        uint256 _buyIndex = users[msg.sender].buyHistory.length - 1;

        require(!getIsRejected(users[msg.sender].buyHistory[_buyIndex].tarif));
        require(block.timestamp - users[msg.sender].buyHistory[_buyIndex].timestamp <= 48 * 3600, "48h");
        
        uint16 price = getPrice(users[msg.sender].buyHistory[_buyIndex].tarif);
        uint16 count = users[msg.sender].buyHistory[_buyIndex].count;
        erc20.transfer(users[msg.sender].buyHistory[_buyIndex].from, centToErc20(price * 100 * count));

        rejectBuy(_buyIndex);
    }

    function takeComsa(address _client, uint256 _buyIndex) public {
        require(!getIsRejected(users[_client].buyHistory[_buyIndex].tarif), "Buy rejected");
        require(!getIsComsaTaken(users[_client].buyHistory[_buyIndex].tarif), "Comsa taken");
        require(block.timestamp - users[_client].buyHistory[_buyIndex].timestamp > 48 * 3600, "48h");

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

    function freezeMoney(uint16 dollar) private{
        require(block.timestamp - users[msg.sender].lastBuyAt > 48 * 3600, "48h");
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

        // CWallet comission (30%)
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

            while (mentor != address(0) && mentor != cWallet && !(hasLVSlot(pt, ptu) && getLV(pt) > i)){
                mentor = users[mentor].mentor;
            }

            if (mentor == cWallet || mentor == address(0)){
                break;
            }
            else{
                makePayment(mentor, lvCent);
                curPriceCent -= lvCent;
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

    function buyPartnerTarif(uint256 _tarif) public {
        require(users[msg.sender].registered && hasActiveMaxClientTarif(msg.sender) && isPartnerFullfilled());

        uint16 count = 1;

        if (isPartnerTarifActive(msg.sender)){
            require(isT1BetterOrSameT2(_tarif, users[msg.sender].partnerTarif));
            count = getExtLevel(users[msg.sender].partnerTarifUsage);
        }

        freezeMoney(getPrice(_tarif));

        newPartnerTarif(_tarif, count);
    }
}
