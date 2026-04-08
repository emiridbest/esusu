// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PaymentVault
 * @notice Receives ERC-20 token payments (USDT, USDC, cUSD, CELO, USDM, G$).
 *         Users send tokens directly via token.transfer(vault, amount) — no approval needed.
 *         Only the owner can withdraw collected funds.
 */
contract PaymentVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Whitelisted tokens that the vault accepts
    mapping(address => bool) public acceptedTokens;
    address[] public tokenList;

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event Withdrawal(address indexed token, address indexed to, uint256 amount);
    event NativeWithdrawal(address indexed to, uint256 amount);
    event NativePaymentReceived(address indexed from, uint256 amount);
    event PaymentReceived(address indexed token, address indexed from, uint256 amount);

    constructor(address _owner, address[] memory _tokens) Ownable(_owner) {
        for (uint256 i = 0; i < _tokens.length; i++) {
            acceptedTokens[_tokens[i]] = true;
            tokenList.push(_tokens[i]);
            emit TokenAdded(_tokens[i]);
        }
    }

    /// @notice Accept native CELO sent directly to the contract
    receive() external payable {
        emit NativePaymentReceived(msg.sender, msg.value);
    }

    // ──────────────────────────── Payments ────────────────────────────

    /// @notice Pay accepted ERC-20 tokens into the vault
    /// @dev Requires users to approve this contract first: `token.approve(vaultAddress, amount)`
    function pay(address token, uint256 amount) external nonReentrant {
        require(acceptedTokens[token], "Token not accepted");
        require(amount > 0, "Amount must be > 0");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit PaymentReceived(token, msg.sender, amount);
    }

    // ──────────────────────────── Owner-only ────────────────────────────

    /// @notice Withdraw ERC-20 tokens from the vault
    function withdraw(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        IERC20(token).safeTransfer(to, amount);
        emit Withdrawal(token, to, amount);
    }

    /// @notice Withdraw native CELO from the vault
    function withdrawNative(address payable to, uint256 amount) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        require(address(this).balance >= amount, "Insufficient native balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Native transfer failed");
        emit NativeWithdrawal(to, amount);
    }

    /// @notice Add a token to the accepted list
    function addToken(address token) external onlyOwner {
        require(!acceptedTokens[token], "Already accepted");
        acceptedTokens[token] = true;
        tokenList.push(token);
        emit TokenAdded(token);
    }

    /// @notice Remove a token from the accepted list
    function removeToken(address token) external onlyOwner {
        require(acceptedTokens[token], "Not accepted");
        acceptedTokens[token] = false;
        // Remove from array
        for (uint256 i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == token) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }
        emit TokenRemoved(token);
    }

    // ──────────────────────────── View ────────────────────────────

    /// @notice Check the vault's balance of a specific token
    function tokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /// @notice Check the vault's native CELO balance
    function nativeBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Get all accepted tokens
    function getAcceptedTokens() external view returns (address[] memory) {
        return tokenList;
    }
}
