// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PaymentRouter
 * @notice Routes utility payments (data, airtime, electricity) through a single
 *         contract so every sale is trackable on-chain via events.
 *         Supports CELO (native), USDT, cUSD, G$, and any future ERC-20 token
 *         the owner whitelists.
 */
contract PaymentRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ──────────────────── Types ────────────────────

    enum PaymentType { Data, Airtime, Electricity, Other }

    // ──────────────────── State ────────────────────

    /// @notice The wallet that receives all payments
    address public recipient;

    /// @notice token address → supported flag
    mapping(address => bool) public supportedTokens;

    /// @notice Running payment counter (also serves as unique payment ID)
    uint256 public paymentCount;

    /// @notice address(0) sentinel used to represent native CELO
    address public constant NATIVE_TOKEN = address(0);

    // ──────────────────── Events ───────────────────

    event PaymentMade(
        uint256 indexed paymentId,
        address indexed payer,
        address indexed token,
        uint256 amount,
        PaymentType paymentType,
        string reference
    );

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event RecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    // ──────────────────── Errors ───────────────────

    error TokenNotSupported(address token);
    error ZeroAmount();
    error ZeroAddress();
    error InsufficientNativeValue();

    // ──────────────────── Constructor ──────────────

    /**
     * @param _recipient  Wallet that receives payments
     * @param _tokens     Initial set of supported ERC-20 token addresses
     */
    constructor(address _recipient, address[] memory _tokens) Ownable(msg.sender) {
        if (_recipient == address(0)) revert ZeroAddress();
        recipient = _recipient;

        // Native CELO is always supported
        supportedTokens[NATIVE_TOKEN] = true;
        emit TokenAdded(NATIVE_TOKEN);

        for (uint256 i = 0; i < _tokens.length; i++) {
            if (_tokens[i] != address(0)) {
                supportedTokens[_tokens[i]] = true;
                emit TokenAdded(_tokens[i]);
            }
        }
    }

    // ──────────────────── Payment functions ────────

    /**
     * @notice Pay with an ERC-20 token. Caller must have approved this contract first.
     * @param token       ERC-20 token address
     * @param amount      Amount in token's smallest unit
     * @param paymentType Category of the payment
     * @param reference   Off-chain reference (phone number, meter ID, etc.)
     */
    function payWithToken(
        address token,
        uint256 amount,
        PaymentType paymentType,
        string calldata reference
    ) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (!supportedTokens[token]) revert TokenNotSupported(token);

        IERC20(token).safeTransferFrom(msg.sender, recipient, amount);

        paymentCount++;
        emit PaymentMade(paymentCount, msg.sender, token, amount, paymentType, reference);
    }

    /**
     * @notice Pay with native CELO. Send the exact amount as msg.value.
     * @param paymentType Category of the payment
     * @param reference   Off-chain reference
     */
    function payWithNative(
        PaymentType paymentType,
        string calldata reference
    ) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();
        if (!supportedTokens[NATIVE_TOKEN]) revert TokenNotSupported(NATIVE_TOKEN);

        (bool sent, ) = recipient.call{value: msg.value}("");
        require(sent, "Native transfer failed");

        paymentCount++;
        emit PaymentMade(paymentCount, msg.sender, NATIVE_TOKEN, msg.value, paymentType, reference);
    }

    // ──────────────────── Admin functions ──────────

    /**
     * @notice Add a supported token
     */
    function addToken(address token) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        supportedTokens[token] = true;
        emit TokenAdded(token);
    }

    /**
     * @notice Remove a supported token
     */
    function removeToken(address token) external onlyOwner {
        supportedTokens[token] = false;
        emit TokenRemoved(token);
    }

    /**
     * @notice Update the payment recipient wallet
     */
    function setRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) revert ZeroAddress();
        address old = recipient;
        recipient = _recipient;
        emit RecipientUpdated(old, _recipient);
    }
}
