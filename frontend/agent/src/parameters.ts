import { createToolParameters } from '@goat-sdk/core';
import { z } from 'zod';

// Use an object with an optional dummy field to ensure proper schema generation
export const EmptyParameters = createToolParameters(z.object({
    _unused: z.string().optional().describe("Unused parameter"),
}));

const USDT_TOKEN_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"
const CELO_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid address');

export class EsusuParameters extends createToolParameters(
    z.object({
        amount: z.number()
            .optional()
            .describe("Claim amount: 0.03 USDT for minipay users, 0.01 CELO for non-minipay users (fixed by contract)"),
        account: addressSchema.optional().describe("Account address to check or interact with"),
        recipient: addressSchema.optional().describe("Recipient address for AI claims"),
        tokenAddress: addressSchema.optional().describe("Token address (optional)"),
        usdtAddress: z.string().default(USDT_TOKEN_ADDRESS).describe("USDT token address on base"),
        celoAddress: z.string().default(CELO_TOKEN_ADDRESS).describe("CELO token address on base"),
    })
) {}

export const FaucetBalanceParameters = createToolParameters(
    z.object({
        tokenAddress: addressSchema
            .optional()
            .describe("Token address to check. Omit to get both CELO and USDT balances"),
        usdtAddress: z.string().default(USDT_TOKEN_ADDRESS).describe("USDT token address on Celo"),
        celoAddress: z.string().default(CELO_TOKEN_ADDRESS).describe("CELO token address on Celo"),
    })
);

export const UserAddressParameters = createToolParameters(
    z.object({
        userAddress: z.string().describe("The user's wallet address"),
    })
);