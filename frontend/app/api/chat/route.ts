import { openai } from "@ai-sdk/openai";
// @ts-ignore - Version conflict with viem
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
// @ts-ignore - Version conflict with viem
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { streamText } from 'ai';
import { NextResponse } from 'next/server';
// @ts-ignore - Optional import
import { esusu } from "@/agent/src";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Export the POST handler function for Next.js API route
export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
        const RPC_URL = process.env.RPC_PROVIDER_URL;
        if (!PRIVATE_KEY || !RPC_URL) {
            return NextResponse.json(
                { error: 'Server misconfigured: missing WALLET_PRIVATE_KEY or RPC_PROVIDER_URL' },
                { status: 500 }
            );
        }

        const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
        const walletClient = createWalletClient({
            account,
            transport: http(RPC_URL),
            chain: celo,
        });

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
    } catch (error: any) {
        console.error('Error in /api/chat:', error);
        return NextResponse.json(
            { error: error?.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
