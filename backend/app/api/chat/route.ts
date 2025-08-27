// @ts-nocheck

// Ensure Node runtime for server-side SDKs
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ensure decorator metadata is available for goat-sdk tools
require('reflect-metadata');

const { openai } = require("@ai-sdk/openai");
const { streamText } = require("ai");
const { getOnChainTools } = require("@goat-sdk/adapter-vercel-ai");
const { viem } = require("@goat-sdk/wallet-viem");
const { createWalletClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { celo } = require("viem/chains");

// Import shared esusu plugin from the monorepo (frontend/agent/src)
// Path: backend/app/api/chat/route.ts -> ../../../../frontend/agent/src/index
const { esusu } = require("../../../../frontend/agent/src/index");

require("dotenv").config();

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
    const RPC_URL = process.env.RPC_PROVIDER_URL;

    if (!PRIVATE_KEY || !RPC_URL) {
      return Response.json(
        { error: 'Server misconfigured: missing WALLET_PRIVATE_KEY or RPC_PROVIDER_URL' },
        { status: 500 }
      );
    }

    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account: account as any,
      transport: http(RPC_URL),
      chain: celo as any,
    });

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
