import { z } from "zod";
import { createToolParameters } from "@goat-sdk/core";

const CELO_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"
const CUSD_TOKEN_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a"
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid address');

export class EsusuParameters extends createToolParameters(
    z.object({
        amount: z.string().describe("Amount of tokens to deposit"),
        tokenAddress: addressSchema.describe("Token address to deposit"),
        account: addressSchema.describe("Account to check balance for"),
        upliner: addressSchema.describe("Address of the upliner to set"),
        celoTokenAddress: z.string().default(CELO_TOKEN_ADDRESS).describe("CELO"),
        cusdTokenAddress: z.string().default(CUSD_TOKEN_ADDRESS).describe("CUSD"),
    })
) {}