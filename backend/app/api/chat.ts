import { openai } from "@ai-sdk/openai";
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
require("dotenv").config();
import { streamText } from 'ai';

import { esusu } from "@/agent/src";

const account = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`);

const walletClient = createWalletClient({
    account: account,
    transport: http(process.env.RPC_PROVIDER_URL),
    chain: celo,
});

// Change to named export for Next.js App Router
export async function POST(req: Request) {
    const { messages } = await req.json();
    const tools = await getOnChainTools({
        // @ts-ignore
        wallet: viem(walletClient),
        plugins: [esusu()],
    });

    const result = streamText({
        model: openai("gpt-4o-mini"),
        system: "You are a helpful agent that performs onchain transactions like sending celo,cusd, implement dolar-cost-averaging using balmy protocol, tokens etc and provides onchain advice based on data given",
        //@ts-ignore
        tools: tools,
        maxSteps: 20,
        messages,
    });

    return result.toDataStreamResponse();
}