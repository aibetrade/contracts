// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./OnlyOwner.sol";
import "./ERC20Token.sol";
import "./User.sol";

uint256 constant MONTH = 30 * 86400;
uint256 constant YEAR = 360 * 86400;
uint256 constant qBonus = 5;

function isClientActive(uint256 date) view returns (bool) {
    return block.timestamp - date <= MONTH;
}

function isPartnerActive(uint256 date) view returns (bool) {
    return block.timestamp - date <= YEAR;
}

contract ReferalBase is TarifsContract, Userable {
    ERC20Token public erc20;
    address bene;

    constructor(address _erc20, address _bene) {
        erc20 = ERC20Token(_erc20);
        bene = _bene;
        users[bene].registered = true;
    }
}

contract ReferalClient is ReferalBase {
    constructor(address _erc20, address _bene) ReferalBase(_erc20, _bene) {}

    function clientScheme(uint128) internal virtual {
        require(0 == 1, "Must be overriden");
    }

    function setMentor(address mentor) public {
        require(mentor != address(0), "Mentor can not be 0");
        require(users[msg.sender].mentor == address(0), "Already have mentor");
        require(users[mentor].registered, "Mentor must be registered user");
        users[msg.sender].mentor = mentor;
        users[mentor].referals.push(msg.sender);
    }

    function hasMaxClientTarif(address user) public view returns (bool) {
        return isClientActive(users[user].clientTarifAt) && getPrice(users[user].clientTarif) == maxClientPrice();
    }

    function buyClientTarif(uint128 _tarif) internal {
        require(users[msg.sender].mentor != address(0), "You need mentor");

        clientScheme(_tarif);

        newClientTarif(_tarif);
    }
}

contract ReferalPartner is ReferalClient {

    event Debug(uint256);


    uint16 public registerPrice;

    constructor(address _erc20, address _bene) ReferalClient(_erc20, _bene) {}

    function toErc20(uint256 plain) public view returns (uint256){
        return plain * (10 ** erc20.decimals());
    }

    function makePayment(address _to, uint16 _cent) internal {
        erc20.transferFrom(msg.sender, _to, _cent * (10** (erc20.decimals() - 2)));
        users[_to].payHistory.push(PayHistoryRec({timestamp: block.timestamp, amount: (uint16)(_cent), from: msg.sender}));
    }

    function clientScheme(uint128 _tarif) internal override {
        if (users[msg.sender].mentor == bene) {
            makePayment(bene, getPrice(_tarif) * 100);
            return;
        }
        address mentor = users[msg.sender].mentor;

        uint256 mc = (getPrice(_tarif) * (getInvitePercent(_tarif) + qBonus)) + getComsa(users[mentor].partnerTarif) * 100;
        uint256 lvc = (getPrice(_tarif) * 100 - mc) / 2;
        uint256 bc = lvc;
        
        // MC logic
        while (mentor != bene && !hasSlot(users[mentor].partnerTarif, users[mentor].partnerTarifUsage)){
            mentor = users[mentor].mentor;
        }

        if (mentor == bene){
            bc += mc;
        }
        else{
            makePayment(mentor, uint16(mc));
            users[mentor].partnerTarifUsage = usedSlot(users[mentor].partnerTarifUsage);
        }

        // LV logic
        mentor = users[msg.sender].mentor;
        for (uint8 i = 0; i < 3; i++){
            // MC logic
            uint128 pt = users[mentor].partnerTarif;
            uint64 ptu = users[mentor].partnerTarifUsage;

            while (mentor != bene && !(hasLVSlot(pt, ptu) && getLV(pt) > i)){
                mentor = users[mentor].mentor;
            }

            if (mentor == bene){
                break;
            }
            else{
                uint256 lvComsa = (getMaxLVComsa(pt) < lvc ? getMaxLVComsa(pt) : lvc) * 100;
                makePayment(mentor, uint16(lvComsa));
                lvc -= lvComsa;
                users[mentor].partnerTarifUsage = usedLVSlot(users[mentor].partnerTarifUsage);
                if (lvc == 0) break;
            }
        }

        bc += lvc;
        makePayment(bene, uint16(bc));
    }

    function partnerScheme(uint128 tarif) private {
        // TODO: Some partner transferring magic
        // erc20.transferFrom(msg.sender, address(this), getPrice(data));
    }

    function setRegisterPrice(uint16 price) public onlyOwner {
        registerPrice = price;
    }

    function RegitsterPartner() public {
        require(hasMaxClientTarif(msg.sender), "Need MAX client tarif");
        require(users[msg.sender].registered == false, "Already registered");

        // Enough money to buy tarif
        require(
            erc20.allowance(msg.sender, address(this)) >= registerPrice,
            "Insufficient allowance"
        );

        makePayment(bene, uint16(registerPrice));

        users[msg.sender].registered = true;
    }

    function isPartnerFullfilled() public view returns (bool) {
        require(
            isPartnerActive(users[msg.sender].partnerTarifAt),
            "No active parent tarif"
        );
        uint64 tu = users[msg.sender].partnerTarifUsage;
        return
            getUsedSlots(tu) ==
            getNumSlots(users[msg.sender].partnerTarif) * (getExtLevel(tu) + 1);
    }

    function buyPartnerTarif(uint128 _tarif) internal {
        require(users[msg.sender].registered, "Need registration");
        require(hasMaxClientTarif(msg.sender), "Need max client tarif");
        require(
            !isPartnerActive(users[msg.sender].partnerTarifAt),
            "Already have active parent tarif"
        );
        require(
            partnerTarifs[0] == _tarif,
            "Can buy only lowest partner tarif"
        );

        partnerScheme(getPrice(_tarif));

        newPartnerTarif(_tarif);
    }

    function extendTarif() public {
        require(isPartnerFullfilled(), "Need fill all partner tarifs");

        partnerScheme(getPrice(users[msg.sender].partnerTarif));

        uint64 tu = users[msg.sender].partnerTarifUsage;
        users[msg.sender].partnerTarifUsage = setExtLevel(
            tu,
            getExtLevel(tu) + 1
        );
        users[msg.sender].partnerTarifAt = block.timestamp;

        users[msg.sender].buyHistory.push(
            BuyHistoryRec({
                tarif: users[msg.sender].partnerTarif,
                timestamp: block.timestamp,
                amount: 1
            })
        );
    }

    function upgradeTarif() public {
        require(isPartnerFullfilled(), "Need fill all partner tarifs");

        uint16 extLevel = getExtLevel(users[msg.sender].partnerTarifUsage);
        uint16 ti = pPriceHash[getPrice(users[msg.sender].partnerTarif)] + 1;
        require(ti < partnerTarifs.length, "No better tarif");
        uint128 pt = partnerTarifs[ti];

        partnerScheme(getPrice(ti) * (extLevel + 1));

        users[msg.sender].partnerTarif = pt;
        users[msg.sender].partnerTarifUsage = setExtLevel(0, extLevel);
        users[msg.sender].partnerTarifAt = block.timestamp;

        users[msg.sender].buyHistory.push(
            BuyHistoryRec({
                tarif: users[msg.sender].partnerTarif,
                timestamp: block.timestamp,
                amount: (extLevel + 1)
            })
        );
    }

    function buyTarif(uint128 _tarif) public {
        // Tarif must exists
        require(tarifsHash[_tarif] == true, "Tarif not found");

        // Enough money to buy tarif
        require(
            erc20.allowance(msg.sender, address(this)) >= getPrice(_tarif),
            "Insufficient allowance"
        );

        if (isPartner(_tarif)) buyPartnerTarif(_tarif);
        else buyClientTarif(_tarif);

        users[msg.sender].buyHistory.push(
            BuyHistoryRec({
                tarif: _tarif,
                timestamp: block.timestamp,
                amount: 1
            })
        );
    }
}
