
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimpleSponsorVault {
    address public admin;

    event Sent(address indexed token, address indexed to, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function transferToken(address token, address to, uint256 amount) external onlyAdmin {
        if (token == address(0)) {
            // Send native CELO
            (bool sent, ) = payable(to).call{value: amount}("");
            require(sent, "Native transfer failed");
        } else {
            // Send ERC20 (e.g., USDT)
            require(IERC20(token).transfer(to, amount), "ERC20 transfer failed");
        }
        emit Sent(token, to, amount);
    }

    // Allow contract to receive CELO
    receive() external payable {}

    // Admin can withdraw any token or CELO
    function withdraw(address token, uint256 amount) external onlyAdmin {
        if (token == address(0)) {
            payable(admin).transfer(amount);
        } else {
            IERC20(token).transfer(admin, amount);
        }
    }
}
