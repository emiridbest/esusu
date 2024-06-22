// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract EsusuSmartContract is ERC20 {
    address public owner;
    uint256 public totalContributions;
    uint256 public payoutInterval = 30 days;
    uint256 public stakingRequirementMultiplier = 5;
    uint256 public monthlyContribution;
    IERC20 public fixedToken;

    address private constant CELO_TOKEN_ADDRESS = address(0); // Example CELO token address
    address private constant CUSD_TOKEN_ADDRESS =
        0x765DE816845861e75A25fCA122bb6898B8B1282a; // Example CUSD token address

    struct Campaign {
        string name;
        string description;
        uint256 contributionAmount;
        uint256 payoutInterval;
        uint256 lastPayoutBlock;
        uint256 totalContributions;
        uint256 monthlyContribution;
        uint256 withdrawIndex;
        mapping(address => bool) joinedUsers;
        mapping(address => string) userName;
        uint256 id;
    }

    struct Staking {
        bool isStaking;
        uint256 stakedAmount;
        uint256 earnedTokens;
    }
    mapping(string => address) public userNameToAddress;
    mapping(address => Staking) public stakings;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256))
        public campaignContributions; // Mapping to hold contributions for each campaign
    uint256 public campaignCounter;

    event ContributionMade(address indexed participant, uint256 amount);
    event Staked(address indexed participant, uint256 amount);
    event Withdrawn(address indexed participant, uint256 amount);
    event Defaulted(address indexed participant, uint256 amount);
    event CampaignCreated(
        address indexed creator,
        uint256 campaignId,
        uint256 contributionAmount
    );

    constructor() ERC20("EsusuToken", "EST") {
        owner = msg.sender;
        _mint(address(this), 21000000 * (10**uint256(decimals())));
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the contract owner can call this function"
        );
        _;
    }

    function contribute(address tokenAddress, uint256 amount) external {
        Campaign storage campaign = campaigns[campaignCounter];
        uint256 contributionAmount = campaign.contributionAmount;
        require(amount > 0, "Contribution amount must be greater than 0");
        require(
            tokenAddress == CELO_TOKEN_ADDRESS ||
                tokenAddress == CUSD_TOKEN_ADDRESS,
            "Unsupported token"
        );

        if (tokenAddress == CELO_TOKEN_ADDRESS) {
            require(
                amount == contributionAmount,
                "Invalid CELO contribution amount"
            );
            totalContributions += amount;
            require(
                IERC20(tokenAddress).transferFrom(
                    msg.sender,
                    address(this),
                    amount
                ),
                "CELO transfer failed"
            );
        } else if (tokenAddress == CUSD_TOKEN_ADDRESS) {
            IERC20 cUsdToken = IERC20(CUSD_TOKEN_ADDRESS);
            require(
                cUsdToken.transferFrom(msg.sender, address(this), amount),
                "cUSD transfer failed"
            );
            totalContributions += amount;
        }

        // Store contribution for the campaign
        campaignContributions[campaignCounter][msg.sender] += amount;

        // Mint 5 EsusuTokens as a reward
        _mint(msg.sender, 5);

        emit ContributionMade(msg.sender, amount);
    }

    function createCampaign(
        string memory _name,
        string memory _description,
        uint256 _contributionAmount
    ) external {
        Campaign storage campaign = campaigns[campaignCounter];
        require(campaign.totalContributions == 0, "Campaign already exists");
        campaign.name = _name;
        campaign.description = _description;
        campaign.contributionAmount = _contributionAmount;
        campaign.monthlyContribution =
            _contributionAmount /
            stakingRequirementMultiplier;
        campaign.lastPayoutBlock = block.number;
        emit CampaignCreated(msg.sender, campaignCounter, _contributionAmount);

        campaignCounter++;
    }

    function joinCampaign(
        uint256 campaignId,
        address tokenAddress,
        string memory userName // Add userName parameter
    ) external payable {
       // require(!stakings[msg.sender].isStaking, "Already staking");
       // check if campaigId is valid
        Campaign storage campaign = campaigns[campaignId];
    require(campaignId < campaignCounter, "Invalid campaign ID");

        require(
            campaign.totalContributions < stakingRequirementMultiplier,
            "Campaign is full"
        );
        require(
            tokenAddress == CELO_TOKEN_ADDRESS ||
                tokenAddress == CUSD_TOKEN_ADDRESS,
            "Unsupported token"
        );
// call stake function(commented off due to the high amount needed to fully function)
// stake( campaignId, contributionAmount); 
        // Update campaign state
        campaign.joinedUsers[msg.sender] = true;
        // Map user's name to their msg.sender
        campaign.userName[msg.sender] = userName;
    }

    function withdraw(uint256 campaignId) external {
        require(stakings[msg.sender].isStaking, "Not staking");
        Campaign storage campaign = campaigns[campaignId];
        require(
            campaign.joinedUsers[msg.sender],
            "User has not joined this campaign"
        );

        // Ensure it's the user's turn to withdraw
        require(
            (block.timestamp - campaign.lastPayoutBlock) >= payoutInterval,
            "Withdrawal not allowed yet"
        );

        // Calculate the withdrawal amount based on the campaign's monthly contribution
        uint256 withdrawalAmount = campaign.monthlyContribution;

        // Transfer the withdrawal amount to the user
        fixedToken.transfer(msg.sender, withdrawalAmount);

        // Update the last payout block and rotation
        campaign.lastPayoutBlock = block.timestamp;
        rotateWithdrawalIndex(campaignId);

        emit Withdrawn(msg.sender, withdrawalAmount);
    }

    function rotateWithdrawalIndex(uint256 campaignId) private {
        Campaign storage campaign = campaigns[campaignId];
        uint256 currentIndex = campaign.withdrawIndex;
        uint256 nextIndex = (currentIndex + 1) % stakingRequirementMultiplier;
        campaign.withdrawIndex = nextIndex;
    }

    function stake(address tokenAddress, uint256 contributionAmount) internal {
        require(
            tokenAddress == CELO_TOKEN_ADDRESS ||
                tokenAddress == CUSD_TOKEN_ADDRESS,
            "Unsupported token"
        );

        if (tokenAddress == CELO_TOKEN_ADDRESS) {
            stakings[msg.sender].stakedAmount =
                stakingRequirementMultiplier *
                contributionAmount;
            require(
                transferFrom(
                    msg.sender,
                    address(this),
                    stakingRequirementMultiplier * contributionAmount
                ),
                "CELO transfer failed"
            );
        } else if (tokenAddress == CUSD_TOKEN_ADDRESS) {
            IERC20 cUsdToken = IERC20(CUSD_TOKEN_ADDRESS);
            stakings[msg.sender].stakedAmount =
                stakingRequirementMultiplier *
                contributionAmount;
            require(
                cUsdToken.transferFrom(
                    msg.sender,
                    address(this),
                    stakingRequirementMultiplier * contributionAmount
                ),
                "cUSD transfer failed"
            );
        }

        stakings[msg.sender].isStaking = true;
        stakings[msg.sender].earnedTokens = stakingRequirementMultiplier;

        emit Staked(msg.sender, stakings[msg.sender].stakedAmount);
    }

    function updatePayoutInterval(uint256 _payoutInterval) external onlyOwner {
        payoutInterval = _payoutInterval;
    }

    function getAllCampaigns() external view returns (uint256[] memory) {
        uint256[] memory campaignIds = new uint256[](campaignCounter);
        for (uint256 i = 0; i < campaignCounter; i++) {
            campaignIds[i] = i;
        }
        return campaignIds;
    }

    function getCampaignDetails(uint256 campaignId)
        external
        view
        returns (
            string memory,
            string memory,
            uint256,
            uint256,
            uint256,
            uint256,
            string memory,
            uint256
        )
    {
        Campaign storage campaign = campaigns[campaignId];
        return (
            campaign.name,
            campaign.description,
            campaign.contributionAmount,
            campaign.payoutInterval,
            campaign.lastPayoutBlock,
            campaign.totalContributions,
            campaign.userName[msg.sender],
            campaign.id
        );
    }

    
}
