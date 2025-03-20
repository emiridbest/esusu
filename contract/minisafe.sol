// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MiniSafeTest
 * @dev A decentralized savings platform with referral system and time-based withdrawal constraints
 * Allows users to deposit CELO and cUSD tokens and earn MST tokens as incentives
 */
contract MiniSafeTest is ERC20, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    /**
     * @dev Struct to track a user's balances and deposit information
     * @param celoBalance Amount of CELO tokens deposited
     * @param cUsdBalance Amount of cUSD tokens deposited
     * @param depositTime Timestamp when the last deposit was made
     * @param tokenIncentive Amount of incentive tokens earned
     */
    struct TokenBalance {
        uint256 celoBalance;
        uint256 cUsdBalance;
        uint256 depositTime;
        uint256 tokenIncentive;
    }
    
    /// @dev Maps user addresses to their token balances and deposit info
    mapping(address => TokenBalance) public balances;
    
    /// @dev Maps users to their referrers (upliners)
    mapping(address => address) public upliners;
    
    /// @dev Maps referrers to their referred users (downliners)
    mapping(address => address[]) public downliners;
    
    /// @dev Address constant representing native CELO token
    address public constant CELO_TOKEN_ADDRESS = address(0);
    
    /// @dev Address of the cUSD token contract
    address public CUSD_TOKEN_ADDRESS = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
    
    /// @dev The percentage of reward given to upliners (10%)
    uint256 public constant REFERRAL_REWARD_PERCENT = 10;
    
    /// @dev Minimum token incentive required to break timelock
    uint256 public constant MIN_TOKENS_FOR_TIMELOCK_BREAK = 15;

    /**
     * @dev Events for tracking contract actions
     */
    event Deposited(address indexed depositor, uint256 amount, address indexed token);
    event Withdrawn(address indexed withdrawer, uint256 amount, address indexed token);
    event TimelockBroken(address indexed breaker, uint256 amount, address indexed token);
    event UplinerSet(address indexed user, address indexed upliner);
    event RewardDistributed(address indexed upliner, address indexed depositor, uint256 amount);

    /**
     * @dev Initializes the contract with initial token supply
     * @param initialOwner Address that will own the contract
     */
    constructor(address initialOwner) ERC20("miniSafeToken", "MST") Ownable(initialOwner) {
        _mint(address(this), 21000000 * 1e18);
    }

    /**
     * @dev Fallback function to receive CELO
     */
    receive() external payable {
        deposit(CELO_TOKEN_ADDRESS, msg.value);
    }

    /**
     * @dev Sets a referrer (upliner) for the caller
     * @param upliner Address of the referrer
     */
    function setUpliner(address upliner) public {
        require(upliner != address(0), "Upliner cannot be the zero address");
        require(upliner != msg.sender, "You cannot set yourself as your upliner");
        require(upliners[msg.sender] == address(0), "Upliner already set");
        
        upliners[msg.sender] = upliner;
        downliners[upliner].push(msg.sender);
        
        emit UplinerSet(msg.sender, upliner);
    }

    /**
     * @dev Returns all downliners for a given upliner
     * @param upliner Address of the upliner
     * @return Array of downliner addresses
     */
    function getDownliners(address upliner) public view returns (address[] memory) {
        return downliners[upliner];
    }

    /**
     * @dev Calculates time (in seconds) since user's last deposit
     * @param depositor Address of the depositor
     * @return Time elapsed since deposit in seconds
     */
    function timeSinceDeposit(address depositor) public view returns (uint256) {
        return block.timestamp - balances[depositor].depositTime;
    } 

    /**
     * @dev Deposit CELO or cUSD tokens into savings
     * @param tokenAddress Address of token being deposited (CELO_TOKEN_ADDRESS for CELO)
     * @param amount Amount of tokens to deposit
     */
    function deposit(address tokenAddress, uint256 amount) public payable nonReentrant {
        require(amount > 0, "Deposit amount must be greater than 0");
        
        TokenBalance storage userBalance = balances[msg.sender];
        
        if (tokenAddress == CELO_TOKEN_ADDRESS) {
            userBalance.celoBalance += amount;
            emit Deposited(msg.sender, amount, CELO_TOKEN_ADDRESS);
        } else if (tokenAddress == CUSD_TOKEN_ADDRESS) {
            IERC20 cUsdToken = IERC20(CUSD_TOKEN_ADDRESS);
            cUsdToken.safeTransferFrom(msg.sender, address(this), amount);
            userBalance.cUsdBalance += amount;
            emit Deposited(msg.sender, amount, CUSD_TOKEN_ADDRESS);
        } else {
            revert("Unsupported token");
        }
        
        // Update deposit time and mint incentive token
        userBalance.depositTime = block.timestamp;
        uint256 incentiveAmount = 1;
        _mint(msg.sender, incentiveAmount);
        
        // Update incentive token balance
        userBalance.tokenIncentive += incentiveAmount;
        
        // Distribute referral rewards
        distributeReferralReward(msg.sender, incentiveAmount);
    }

    /**
     * @dev Distributes reward tokens to upliner when their downliner deposits
     * @param depositor Address of the depositor
     * @param amount Base amount for calculating rewards
     */
    function distributeReferralReward(address depositor, uint256 amount) internal {
        address upliner = upliners[depositor];
        if (upliner != address(0)) {
            uint256 uplinerReward = (amount * REFERRAL_REWARD_PERCENT) / 100;
            _mint(upliner, uplinerReward);
            emit RewardDistributed(upliner, depositor, uplinerReward);
        }
    }

    /**
     * @dev Updates the cUSD token address (owner only)
     * @param newCUSDTokenAddress New cUSD token contract address
     */
    function updateCUSDTokenAddress(address newCUSDTokenAddress) public onlyOwner {
        require(newCUSDTokenAddress != address(0), "Invalid address");
        CUSD_TOKEN_ADDRESS = newCUSDTokenAddress;
    }

    /**
     * @dev Checks if withdrawal window is currently active
     * @return Boolean indicating if withdrawals are currently allowed
     * @notice Allows withdrawals between 28th and 30th of each month
     */
    function canWithdraw() public view returns (bool) {
        uint256 currentDay = (block.timestamp / 1 days) % 30;
        return currentDay >= 28 && currentDay < 30;
    }

    /**
     * @dev Allows users to withdraw funds outside the normal window by burning incentive tokens
     * @param tokenAddress Address of token to withdraw
     */
    function breakTimelock(address tokenAddress) external nonReentrant {
        TokenBalance storage tokenBalance = balances[msg.sender];
        
        // Validate user has funds to withdraw
        require(
            (tokenBalance.celoBalance > 0 || tokenBalance.cUsdBalance > 0),
            "No savings to withdraw"
        );
        
        // Ensure this is outside the normal withdrawal window
        require(!canWithdraw(), "Cannot use this method during withdrawal window");
        
        // Check if user has enough incentive tokens
        uint256 tokenIncentive = tokenBalance.tokenIncentive;
        require(
            tokenIncentive >= MIN_TOKENS_FOR_TIMELOCK_BREAK,
            "Insufficient tokens to break timelock"
        );

        uint256 amount;
        
        // Handle token-specific withdrawal logic
        if (tokenAddress == CELO_TOKEN_ADDRESS) {
            amount = tokenBalance.celoBalance;
            tokenBalance.celoBalance = 0;
            
            // Transfer CELO using call
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "CELO transfer failed");
        } else if (tokenAddress == CUSD_TOKEN_ADDRESS) {
            amount = tokenBalance.cUsdBalance;
            tokenBalance.cUsdBalance = 0;
            
            // Transfer cUSD tokens safely
            IERC20 cUsdToken = IERC20(CUSD_TOKEN_ADDRESS);
            cUsdToken.safeTransfer(msg.sender, amount);
        } else {
            revert("Unsupported token");
        }
        
        // Burn the incentive tokens
        _burn(msg.sender, tokenIncentive);
        tokenBalance.tokenIncentive = 0;
        
        emit TimelockBroken(msg.sender, amount, tokenAddress);
    }

    /**
     * @dev Standard withdrawal function during the allowed time window
     * @param tokenAddress Address of token to withdraw
     */
    function withdraw(address tokenAddress) external nonReentrant {
        TokenBalance storage tokenBalance = balances[msg.sender];
        
        // Validate withdrawal is within the allowed time window
        require(canWithdraw(), "Cannot withdraw outside the withdrawal window");
        
        uint256 amount;
        
        // Handle token-specific withdrawal logic
        if (tokenAddress == CELO_TOKEN_ADDRESS) {
            amount = tokenBalance.celoBalance;
            require(amount > 0, "No CELO balance to withdraw");
            tokenBalance.celoBalance = 0;
            
            // Transfer CELO using call
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "CELO transfer failed");
        } else if (tokenAddress == CUSD_TOKEN_ADDRESS) {
            amount = tokenBalance.cUsdBalance;
            require(amount > 0, "No cUSD balance to withdraw");
            tokenBalance.cUsdBalance = 0;
            
            // Transfer cUSD tokens safely
            IERC20 cUsdToken = IERC20(CUSD_TOKEN_ADDRESS);
            cUsdToken.safeTransfer(msg.sender, amount);
        } else {
            revert("Unsupported token");
        }

        emit Withdrawn(msg.sender, amount, tokenAddress);
    }

    /**
     * @dev Gets a user's balance for a specific token
     * @param account User address
     * @param tokenAddress Address of token to check
     * @return Balance amount
     */
    function getBalance(address account, address tokenAddress) public view returns (uint256) {
        TokenBalance storage tokenBalance = balances[account];
        
        if (tokenAddress == CELO_TOKEN_ADDRESS) {
            return tokenBalance.celoBalance;
        } else if (tokenAddress == CUSD_TOKEN_ADDRESS) {
            return tokenBalance.cUsdBalance;
        } else {
            revert("Unsupported token");
        }
    }
}