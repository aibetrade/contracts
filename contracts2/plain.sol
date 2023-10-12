// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// File: contracts-src\utils\MultyOwner.sol




contract MultyOwner {
    mapping(address => bool) public owners;

    event OwnerAdded(address);
    event OwnerRemoved(address);

    function appendOwner(address _owner) virtual public onlyOwner{
        owners[_owner] = true;
        emit OwnerAdded(_owner);
    }

    function removeOwner(address _owner) virtual public onlyOwner{
        owners[_owner] = false;
        emit OwnerRemoved(_owner);
    }

    constructor() {
        owners[msg.sender] = true;
        emit OwnerAdded(msg.sender);
    }

    modifier onlyOwner() {
        require(owners[msg.sender], "Only the owner can call this function.");
        _;
    }
}

// File: contracts-src\stores\AppStore.sol



uint256 constant APP_STORE_CODE = uint256(keccak256("APP_STORE_CODE"));

contract AppStore is MultyOwner {
    mapping(uint256 => address) apps;

    function setApp(uint256 _code, address _app) public onlyOwner {
        apps[_code] = _app;
    }
}

// File: contracts-src\apps\BaseApp.sol



contract BaseApp is MultyOwner {
    AppStore public appStore;

    function setAppStore(address _appStore) public onlyOwner {
        appStore = AppStore(_appStore);
    }
}

// File: contracts-src\utils\TarifDataLib.sol




uint16 constant REGISTRATION_KEY = 65535;

library TarifDataLib {
    // // Static tarif data (not changable)
    function tarifKey(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif);
    }

    function getPrice(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 1));
    }

    function getNumSlots(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 2));
    }

    function getComsa(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 3));
    }

    function hasCompress(uint256 _tarif) public pure returns (bool) {
        return (uint16)(_tarif >> (16 * 4)) > 0;
    }

    function getNumLVSlots(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 5));
    }

    function getLV(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 6));
    }

    function getFullNum(uint256 _tarif) public pure returns (uint16) {
        return (uint16)(_tarif >> (16 * 7));
    }

    // ---
    function isRegister(uint256 _tarif) public pure returns (bool) {
        return tarifKey(_tarif) == REGISTRATION_KEY;
    }

    function isPartner(uint256 _tarif) public pure returns (bool) {
        return getNumSlots(_tarif) > 0;
    }    
}

// File: contracts-src\stores\TarifsStore.sol





contract TarifsStore is BaseApp {
    uint256[] public tarifs;

    function getAll() public view returns (uint256[] memory) {
        return tarifs;
    }

    function setAll(uint256[] calldata _tarifs) public onlyOwner {
        tarifs = new uint256[](0);
        for (uint8 i = 0; i < _tarifs.length; i++) {
            tarifs.push(_tarifs[i]);
        }
    }

    // // Static tarif data (not changable)
    function tarifsCount() public view returns (uint256) {
        return tarifs.length;
    }

    function exists(uint16 _tarifKey) public view returns (bool) {
        for (uint8 i = 0; i < tarifs.length; i++) {
            if (TarifDataLib.tarifKey(tarifs[i]) == _tarifKey) return true;
        }
        return false;
    }

    // // Static tarif data (not changable)
    function tarif(uint16 _tarifKey) public view returns (uint256) {
        for (uint8 i = 0; i < tarifs.length; i++) {
            if (TarifDataLib.tarifKey(tarifs[i]) == _tarifKey) return tarifs[i];
        }
        return 0;
    }

    function isLast(uint16 _tarifKey) public view returns (bool) {
        if (tarifs.length == 0) return false;
        return _tarifKey == TarifDataLib.tarifKey(tarifs[tarifs.length - 1]);
    }

    function isT1BetterOrSameT2(uint16 _tarifKey1, uint16 _tarifKey2) public view returns (bool) {
        bool t2Found = false;

        if (_tarifKey2 == 0) return true; // Any model better then none.
        // if (k1 == k2) return true;

        for (uint8 i = 0; i < tarifs.length; i++) {
            if (TarifDataLib.tarifKey(tarifs[i]) == _tarifKey2)
                t2Found = true;
            if (TarifDataLib.tarifKey(tarifs[i]) == _tarifKey1)
                return t2Found;
        }

        return false;
    }    
}

// File: contracts-src\stores\UsersTreeStore.sol



contract UsersTreeStore is BaseApp {
    mapping(address => address) public mentor;
    address[] public registeredUsers;
   
    function registeredUsersCount() public view returns (uint256) {
        return registeredUsers.length;
    }

    function getRegisteredUsers() public view returns (address[] memory) {
        return registeredUsers;
    }

    function setRegisteredUsers(address[] memory _items) public onlyOwner{
        registeredUsers = _items;
    }

    function setMentor(address _mentor) public {
        require(_mentor != address(0) && msg.sender != _mentor);
        require(mentor[msg.sender] == address(0) || owners[msg.sender]);
        require(mentor[_mentor] != address(0) || _mentor == address(1));

        if (mentor[msg.sender] == address(0)) registeredUsers.push(msg.sender);
        mentor[msg.sender] = _mentor;
    }   
}

// File: contracts-src\utils\ERC20Token.sol




contract ERC20Token {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public _allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply * (10**uint256(decimals));
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(to != address(0), "Invalid recipient address");
        require(balanceOf[msg.sender] >= value, "Insufficient balance");

        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        _allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(to != address(0), "Invalid recipient address");
        require(balanceOf[from] >= value, "Insufficient balance");
        require(_allowances[from][msg.sender] >= value, "Allowance exceeded");

        balanceOf[from] -= value;
        balanceOf[to] += value;
        _allowances[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }

    // Function to set initial balance for specific accounts
    function setInitialBalance(address account, uint256 balance) public {
        require(msg.sender == address(this), "Only the contract itself can call this function");
        balanceOf[account] = balance;
    }
}

// File: contracts-src\stores\BuyHistory.sol



uint256 constant BUY_HISTORY_CODE = uint256(keccak256("BUY_HISTORY_CODE"));

uint8 constant BUY_STATE_NEW = 0;
uint8 constant BUY_STATE_REJECTED = 1;
uint8 constant BUY_STATE_ACCEPTED = 2;

struct BuyHistoryRec {
    uint256 timestamp;
    uint256 tarif;
    uint16 count; // How many tarifs was bought
    uint8 state;
    uint32 payed;
}

contract BuyHistory is BaseApp {
    mapping(address => BuyHistoryRec[]) History;

    function getHistoryCount(address user) public view returns (uint256) {
        return History[user].length;
    }

    function getHistory(address user) public view returns (BuyHistoryRec[] memory) {
        return History[user];
    }

    function getHistoryRec(address user, uint256 index) public view returns (BuyHistoryRec memory) {
        return History[user][index];
    }

    function setHistory(address user, BuyHistoryRec[] memory buyHistory) public onlyOwner {
        History[user] = buyHistory;
    }

    function clear(address user) public onlyOwner {
        History[user] = new BuyHistoryRec[](0);
    }

    function setHistoryRec(address user, uint256 index, BuyHistoryRec memory buy) public onlyOwner {
        History[user][index] = buy;
    }

    function append(address user, BuyHistoryRec memory buy) public onlyOwner {
        History[user].push(buy);
    }

    function getLastRec(address acc) public view returns (BuyHistoryRec memory) {
        if (History[acc].length == 0) return BuyHistoryRec(0, 0, 0, 0, 0);
        return History[acc][History[acc].length - 1];
    }
}

// File: contracts-src\stores\PayHistory.sol



// import "../Tarif.sol";
// import "../ERC20Token.sol";

uint256 constant PAY_HISTORY_APP_CODE = uint256(keccak256("PAY_HISTORY"));

uint8 constant PAY_CODE_INVITE_CLI = 1;
uint8 constant PAY_CODE_INVITE_PAR = 2;
uint8 constant PAY_CODE_COMPANY = 3;
uint8 constant PAY_CODE_QUART_CLI = 4;
uint8 constant PAY_CODE_QUART_PAR = 5;
uint8 constant PAY_CODE_MAGIC = 6;
uint8 constant PAY_CODE_REGISTER = 7;

uint8 constant PAY_CODE_CLI_MATRIX = 8;
uint8 constant PAY_CODE_CLI_LV = 9;
uint8 constant PAY_CODE_PAR_RANK = 10;

struct PayHistoryRec {
    uint256 timestamp;
    address from;
    uint64 cents;
    uint8 payCode;
}

contract PayHistory is BaseApp {
    mapping(address => PayHistoryRec[]) History;

    function getHistoryCount(address user) public view returns (uint256) {
        return History[user].length;
    }

    function getHistory(address user) public view returns (PayHistoryRec[] memory) {
        return History[user];
    }

    function setHistory(address user, PayHistoryRec[] memory payHistory) public onlyOwner {
        History[user] = payHistory;
    }

    function getHistoryRec(address user, uint256 index) public view returns (PayHistoryRec memory) {
        return History[user][index];
    }

    function setHistoryRec(address user, uint256 index, PayHistoryRec memory pay) public onlyOwner {
        History[user][index] = pay;
    }

    function clear(address user) public onlyOwner {
        History[user] = new PayHistoryRec[](0);
    }

    function append(address user, PayHistoryRec memory pay) public onlyOwner {
        History[user].push(pay);
    }

    function getLastBuy(address acc) public view returns (PayHistoryRec memory) {
        if (History[acc].length == 0) return PayHistoryRec(0, 0, 0, 0);
        return History[acc][History[acc].length - 1];
    }
}

// File: contracts-src\stores\AddressFlagsStore.sol



contract AddressFlagsStore is BaseApp {
    mapping(address => bool) public flags;

    function setFlag(address _acc, bool _flag) public onlyOwner{
        flags[_acc] = _flag;
    }
}

// File: contracts-src\apps\UsersFinanceApp.sol




// import "../Tarif.sol";
uint256 constant ERC20_APP_CODE = uint256(keccak256("ERC20_APP_CODE"));
uint256 constant USER_FINANCE_APP_CODE = uint256(keccak256("USER_FINANCE_APP_CODE"));
uint256 constant COMSA_FLAGS_STORE_CODE = uint256(keccak256("COMSA_FLAGS_STORE_CODE"));

contract UsersFinanceApp is BaseApp {

    function rejectBuy(address _acc) public onlyOwner {
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

        AddressFlagsStore comsa = appStore.apps(COMSA_FLAGS_STORE_CODE);
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

    function makePayment(address _from, address _to, uint64 _cent, uint8 _payCode) public onlyOwner {
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

// File: contracts-src\stores\RankMatrix.sol



contract RankMatrix is BaseApp {
    uint8 public maxRank;
    uint8 public maxLevel;
    mapping(uint16 => uint8) public matrix;
    
    function toKey(uint16 _rank, uint16 _level) pure public returns (uint16) {
        return (_rank << 8 ) | _level;
    }

    function fromKey(uint16 key) pure public returns (uint8 _rank, uint8 _level) {
        return (uint8((key >> 8) & 0xFF), uint8(key & 0xFF));
    }

    function setMatrix(uint16[] calldata _keys, uint8[] calldata _values) public onlyOwner{
        uint8 maxRank_ = 0;
        uint8 maxLevel_ = 0;

        for (uint16 i = 0; i < _keys.length; i++){
            (uint8 rank, uint8 level) = fromKey(_keys[i]);
            if (rank > maxRank_) maxRank_ = rank;
            if (level > maxLevel_) maxLevel_ = level;
            matrix[_keys[i]] = _values[i];
        }

        maxRank = maxRank_;
        maxLevel = maxLevel_;
    }
}

// File: contracts-src\apps\ReferalApp.sol










uint256 constant REFERAL_APP_CODE = uint256(keccak256("REFERAL_APP_CODE"));

contract Referal is BaseApp {
    AppStore public appStore;
    
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

    uint16 public registerPrice;
    function setRegisterPrice(uint16 _registerPrice) public onlyOwner {
        registerPrice = _registerPrice;
    }

    function canTakeComsa(address _client) public view returns(bool){        
        BuyHistoryRec memory buy = usersFinance.getLastBuy(_client);
        if (buy.tarif == 0 || buy.state == BUY_STATE_REJECTED || block.timestamp - buy.timestamp < 48 * 3600) return false;        

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
        uint8 maxLevel = rankMatrix.maxLevel();

        uint32 basePriceCent = curPriceCent;
        uint8 level = 1;

        while (true){
            if (mentor == address(0) || mentor == address(1) || basePriceCent == 0 || level > maxLevel){
                break;
            }

            if (usersTarifsStore.isPartnerActive(mentor)){
                uint8 mentorRank = usersTarifsStore.ranks(mentor);
                uint8 perc = rankMatrix.matrix(rankMatrix.toKey(mentorRank, level));

                // Change level only if there was a payment
                if (perc > 0){
                    uint32 lvCent = basePriceCent * perc / 100;
                    usersFinance.makePayment(_client, mentor, lvCent, PAY_CODE_PAR_RANK);
                    curPriceCent -= lvCent;                
                    level++;
                }
            }

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

        usersFinance.addUserBuy(msg.sender,
            BuyHistoryRec({
                tarif: 65535,
                timestamp: block.timestamp,
                count: 1,
                state: BUY_STATE_ACCEPTED
            })
        );
        // usersTarifsStore.newPartnerTarif(msg.sender, REGISTRATION_KEY, 1, 1);
        usersTarifsStore.register(msg.sender);
    }

    function canBuy(address _acc) public view returns (bool) {
        if (usersTree.blockedUsers(_acc) || usersTree.getMentor(_acc) == address(0)) return false;
        BuyHistoryRec memory buy = usersFinance.getLastBuy(_acc);
        return !TarifDataLib.isPartner(buy.tarif) || buy.state != BUY_STATE_NEW || (block.timestamp - buy.timestamp > 48 * 3600);
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

        require(buyCount > 0);

        if (usersTarifsStore.isPartnerActive(msg.sender) && (level == usersTarifsStore.getLevel(msg.sender))){
            uint256 pt = usersTarifsStore.pTarif(msg.sender);
            usersFinance.freezeMoney((TarifDataLib.getPrice(tarif) - TarifDataLib.getPrice(pt)) * buyCount, msg.sender);
        }
        else{
            usersFinance.freezeMoney(TarifDataLib.getPrice(tarif) * buyCount, msg.sender);
        }

        // Если есть невзятая комиссия, то забрать ее. Иначе просто запомнить текущий платеж.
        usersTarifsStore.newPartnerTarif(msg.sender, tarif, buyCount, level);
    }
}
