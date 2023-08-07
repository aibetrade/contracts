// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Tarif.sol";
import "./OnlyOwner.sol";
import "./IERC20.sol";
import "./User.sol";

uint256 constant MONTH = 30 * 86400;
uint256 constant YEAR = 360 * 86400;

function isClientActive(uint256 date) view returns (bool) {
    return block.timestamp - date <= MONTH;
}

function isPartnerActive(uint256 date) view returns (bool) {
    return block.timestamp - date <= YEAR;
}

contract ReferalBase is TarifsContract, Userable {
    IERC20 public erc20;
    address bene;

    constructor(address _erc20, address _bene) {
        erc20 = IERC20(_erc20);
        bene = _bene;
    }
}

contract ReferalClient is ReferalBase {
    constructor(address _erc20, address _bene) ReferalBase(_erc20, _bene) {}

    function clientScheme(uint16) virtual internal {
        require(0 == 1, "Must be overriden");
    }

    function setMentor(address mentor) public {
        require(users[msg.sender].mentor == address(0), "Already have mentor");
        users[msg.sender].mentor = mentor;
    }

    function hasMaxClientTarif() public view returns (bool) {
        require(
            isClientActive(users[msg.sender].clientTarifAt),
            "No active client tarif"
        );
        return getPrice(users[msg.sender].clientTarif) == maxClientPrice();
    }

    function buyClientTarif(uint128 _tarif) internal {
        require(users[msg.sender].mentor != address(0), "You need mentor");

        clientScheme(getPrice(_tarif));

        newClientTarif(_tarif);
    }
}

contract ReferalPartner is ReferalClient {
    uint16 public registerPrice;

    constructor(address _erc20, address _bene) ReferalClient(_erc20, _bene){}

    function clientScheme(uint16 price) override internal {
        // TODO: Some client transferring magic
        // erc20.transferFrom(msg.sender, address(this), getPrice(data));
    }

    function partnerScheme(uint16 price) private {
        // TODO: Some client transferring magic
        // erc20.transferFrom(msg.sender, address(this), getPrice(data));
    }

    function setRegisterPrice(uint16 price) public onlyOwner {
        registerPrice = price;
    }

    function RegitsterPartner() public {
        require(hasMaxClientTarif(), "Need MAX client tarif");
        require(users[msg.sender].registered == false, "Already registered");

        // Enough money to buy tarif
        require(
            erc20.allowance(msg.sender, address(this)) >= registerPrice,
            "Insufficient allowance"
        );

        erc20.transferFrom(msg.sender, address(this), registerPrice);

        users[msg.sender].registered = true;
    }

    function isPartnerFullfilled() public view returns (bool) {
        require(
            isPartnerActive(users[msg.sender].partnerTarifAt),
            "No active parent tarif"
        );
        uint64 tu = users[msg.sender].partnerTarifUsage;
        return getUsedSlots(tu) == getNumSlots(tu) * (getExtLevel(tu) + 1);
    }

    function buyPartnerTarif(uint128 _tarif) internal {
        require(users[msg.sender].registered, "Need registration");
        require(hasMaxClientTarif(), "Need max client tarif");
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
