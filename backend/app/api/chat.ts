// @ts-nocheck
const { openai } = require("@ai-sdk/openai");
const { streamText } = require("ai");
const { getOnChainTools } = require("@goat-sdk/adapter-vercel-ai");
const { viem } = require("@goat-sdk/wallet-viem");
const { createWalletClient, http, webSocket, fallback } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { celo } = require("viem/chains");
const { esusu } = require("../../agent/src");

require("dotenv").config();

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Change to named export for Next.js App Router
export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        
        const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
        const RPC_URL = process.env.RPC_PROVIDER_URL;
        
        if (!PRIVATE_KEY) {
            return Response.json(
                { error: 'Server misconfigured: missing WALLET_PRIVATE_KEY' },
                { status: 500 }
            );
        }

        const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
        // Use fallback RPC with dRPC WebSocket primary, HTTP fallback
        // Can be overridden by RPC_PROVIDER_URL env var
        const rpcTransport = RPC_URL 
            ? (RPC_URL.startsWith('wss://') || RPC_URL.startsWith('ws://') ? webSocket(RPC_URL) : http(RPC_URL))
            : fallback([
                webSocket('wss://celo.drpc.org'),
                http('https://celo.drpc.org'),
              ]);
        
        const walletClient = createWalletClient({
            account: account as any,
            transport: rpcTransport,
            chain: celo as any,
        });

        // Completely bypass TypeScript for GOAT SDK to avoid type depth issues
        let tools: any = {};
        try {
            tools = await getOnChainTools({
                wallet: viem(walletClient),
                plugins: [esusu()],
            });
        } catch (toolsError) {
            console.error('Failed to initialize tools:', toolsError);
            tools = {};
        }

        const result = streamText({
            model: openai("gpt-4o-mini"),
            system: "You are a helpful agent that performs onchain transactions like sending celo,cusd, implement dolar-cost-averaging using balmy protocol, tokens etc and provides onchain advice based on data given",
            tools: tools as any,
            maxSteps: 20,
            messages,
        });

        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error('Error in /api/chat:', error);
        return Response.json(
            { error: error?.message || 'Internal server error' },
            { status: 500 }
        );
    }
}