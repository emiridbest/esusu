// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MiniSafe is ERC20{
    struct TokenBalance {
        uint256 celoBalance;
        uint256 cUsdBalance;
        uint256 depositTime;
        uint256 tokenIncentive; // Declare tokenIncentive here
    }

    mapping(address => TokenBalance) public balances;
    uint256 public lockDuration = 1 weeks;
    address private constant CELO_TOKEN_ADDRESS = address(0);
    address private constant CUSD_TOKEN_ADDRESS =
        0x765DE816845861e75A25fCA122bb6898B8B1282a;

    constructor() ERC20("miniSafeToken", "MST") {
        _mint(address(this), 21000000);
    }

    event Deposited(
        address indexed depositor,
        uint256 amount,
        address indexed token
    );
    event Withdrawn(
        address indexed withdrawer,
        uint256 amount,
        address indexed token
    );
    event TimelockBroken(address indexed breaker, uint256 totalSavings);

    receive() external payable {
        deposit(CELO_TOKEN_ADDRESS, msg.value);
    }

    function deposit(address tokenAddress, uint256 amount) public {
        if (tokenAddress == CELO_TOKEN_ADDRESS) {
            require(amount > 0, "CELO deposit amount must be greater than 0");
            TokenBalance storage celoBalance = balances[msg.sender];
            celoBalance.celoBalance += amount;
            celoBalance.depositTime = block.timestamp;
            celoBalance.tokenIncentive = balanceOf(msg.sender); // Set tokenIncentive on deposit
            emit Deposited(msg.sender, amount, CELO_TOKEN_ADDRESS);
        } else if (tokenAddress == CUSD_TOKEN_ADDRESS) {
            IERC20 cUsdToken = IERC20(CUSD_TOKEN_ADDRESS);
            require(
                cUsdToken.transferFrom(msg.sender, address(this), amount),
                "Transfer failed. Make sure to approve the contract to spend the cUSD tokens."
            );
            TokenBalance storage cUsdBalance = balances[msg.sender];
            cUsdBalance.cUsdBalance += amount;
            cUsdBalance.depositTime = block.timestamp;
            emit Deposited(msg.sender, amount, CUSD_TOKEN_ADDRESS);
        } else {
            revert("Unsupported token");
        }
        _mint(msg.sender, 1);
        TokenBalance storage tokenIncentive = balances[msg.sender]; // Set tokenIncentive on deposit
        tokenIncentive.tokenIncentive += 1;
    }

    function breakTimelock(address tokenAddress) public payable {
        TokenBalance storage tokenBalance = balances[msg.sender];
        uint256 amount;
        require(
            (tokenBalance.celoBalance > 0 || tokenBalance.cUsdBalance > 0),
            "No savings to withdraw"
        );
        // If the lock duration has not passed, reduce the total savings by the token incentive
        if (timeSinceDeposit(msg.sender) < lockDuration) {
            uint256 tokenIncentive = tokenBalance.tokenIncentive;
            require(
                tokenIncentive >= 1,
                "Insufficient savings to break timelock"
            );

            // Burn the tokens used as an incentive
            if (tokenAddress == CELO_TOKEN_ADDRESS) {
                amount = tokenBalance.celoBalance;
                tokenBalance.celoBalance = 0;
                require(msg.value == amount, "Incorrect value sent");
                payable(msg.sender).transfer(amount);
            } else if (tokenAddress == CUSD_TOKEN_ADDRESS) {
                amount = tokenBalance.cUsdBalance;
                tokenBalance.cUsdBalance = 0;
                IERC20 cUsdToken = IERC20(CUSD_TOKEN_ADDRESS);
                require(
                    msg.value == 0,
                    "Cannot send value with cUSD withdrawal"
                );
                require(
                    cUsdToken.transfer(msg.sender, amount),
                    "Transfer failed"
                );
            } else {
                revert("Unsupported token");
            }
            transferFrom(msg.sender, address(0), tokenIncentive);

            emit TimelockBroken(msg.sender, 1);
        }
    }

    function timeSinceDeposit(address depositor) public view returns (uint256) {
        return block.timestamp - balances[depositor].depositTime;
    }

    function canWithdraw(address depositor) public view returns (bool) {
        TokenBalance storage tokenBalance = balances[depositor];
        return ((tokenBalance.celoBalance > 0 &&
            timeSinceDeposit(depositor) >= lockDuration) ||
            (tokenBalance.cUsdBalance > 0 &&
                timeSinceDeposit(depositor) >= lockDuration));
    }

    function withdraw(address tokenAddress) public {
        require(
            canWithdraw(msg.sender),
            "Cannot withdraw before lock duration or no tokens deposited"
        );

        TokenBalance storage tokenBalance = balances[msg.sender];
        uint256 amount;

        if (tokenAddress == CELO_TOKEN_ADDRESS) {
            amount = tokenBalance.celoBalance;
            tokenBalance.celoBalance = 0;
            payable(msg.sender).transfer(amount);
        } else if (tokenAddress == CUSD_TOKEN_ADDRESS) {
            amount = tokenBalance.cUsdBalance;
            tokenBalance.cUsdBalance = 0;
            IERC20 cUsdToken = IERC20(CUSD_TOKEN_ADDRESS);
            require(cUsdToken.transfer(msg.sender, amount), "Transfer failed");
        } else {
            revert("Unsupported token");
        }

        emit Withdrawn(msg.sender, amount, tokenAddress);
    }

    function getBalance(address account, address tokenAddress)
        public
        view
        returns (uint256)
    {
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