import { createToolParameters } from '@goat-sdk/core';
import { z } from 'zod';

export const EmptyParameters = createToolParameters(z.object({}));

const USDT_TOKEN_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"
const CUSD_TOKEN_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a"
const USDC_TOKEN_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C"
const CELO_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid address');

export class EsusuParameters extends createToolParameters(
    z.object({
        amount: z.number()
            .int('Percentage must be a whole number')
            .min(1, 'Percentage must be between 1 and 20')
            .max(20, 'Percentage must be between 1 and 20')
            .optional()
            .describe("Percentage amount to claim from the faucet (1-20%)"),
        account: addressSchema.optional().describe("Account address to check or interact with"),
        recipient: addressSchema.optional().describe("Recipient address for AI claims"),
        tokenAddress: addressSchema.optional().describe("Token address (optional)"),
        usdtAddress: z.string().default(USDT_TOKEN_ADDRESS).describe("USDT token address on base"),
        celoAddress: z.string().default(CELO_TOKEN_ADDRESS).describe("CELO token address on base"),
        cusdAddress: z.string().default(CUSD_TOKEN_ADDRESS).describe("cUSD token address on base"),
        usdcAddress: z.string().default(USDC_TOKEN_ADDRESS).describe("USDC token address on base"),
    })
) {}
export const FeedbackParameters = createToolParameters(
    z.object({
        agentId: z.number().default(126).describe("The agent ID (fixed at 126)"),
        value: z.number().int().min(0).max(100).describe("Feedback rating from 0 to 100"),
        valueDecimals: z.number().int().default(0).describe("Number of decimals (0 for integer rating)"),
        tag1: z.string().describe("Primary feedback tag/category"),
        tag2: z.string().optional().default("").describe("Secondary feedback tag/category"),
        endpoint: z.string().describe("API endpoint or service identifier"),
        feedbackURI: z.string().optional().default("").describe("URI pointing to detailed feedback data"),
        feedbackHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).describe("Keccak256 hash of feedback content")
    })
);

export const UserAddressParameters = createToolParameters(
    z.object({
        userAddress: z.string().describe("The user's wallet address"),
    })
);