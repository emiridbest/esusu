/**
 *Submitted for verification at celoscan.io on 2025-08-19
*/

// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.0;

contract TransactionCount {
    uint256 public txCount;

    function increment() public {
        txCount += 1;
    }
}