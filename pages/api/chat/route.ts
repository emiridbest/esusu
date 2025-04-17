import { openai } from "@ai-sdk/openai";
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
require("dotenv").config();
import { streamText } from 'ai';

import { esusu } from "@/agent/dist";
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const account = privateKeyToAccount(process.env.NEXT_PUBLIC_WALLET_PRIVATE_KEY as `0x${string}`);

const walletClient = createWalletClient({
    account: account,
    transport: http(process.env.NEXT_PUBLIC_RPC_PROVIDER_URL),
    chain: celo,
});


export async function POST(req: Request) {
    const { messages } = await req.json();
    const tools = await getOnChainTools({
        // @ts-ignore
        wallet: viem(walletClient),
        plugins: [esusu()],
    });

    const result = streamText({
        model: openai("gpt-4o-mini"),
        system: "You are a helpful agent that performs onchain transactions like depositing celo,cusd on the Esusu contract as well as educate users and answer queries.",
        tools: tools,
        maxSteps: 20,
        messages,
    });

    return result.toDataStreamResponse();
}