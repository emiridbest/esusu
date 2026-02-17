import { LanguageModel, streamText } from "ai";
import { createThirdwebAI } from "@thirdweb-dev/ai-sdk-provider";
import { openai } from "@ai-sdk/openai";
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { NextResponse } from 'next/server';
import { esusu } from "@/agent/src";


export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const thirdwebAI = createThirdwebAI({
    secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

export async function POST(req: Request) {
    const { messages, id, userAddress } = await req.json();



    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
    const RPC_URL = process.env.RPC_PROVIDER_URL;
    if (!PRIVATE_KEY) {
        return NextResponse.json(
            { error: 'Server misconfigured: missing WALLET_PRIVATE_KEY' },
            { status: 500 }
        );
    }

    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const rpcTransport = RPC_URL
        ? http(RPC_URL, { timeout: 30_000, retryCount: 3 })
        : http('https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8', {
            timeout: 30_000,
            retryCount: 3,
        });

    const walletClient = createWalletClient({
        account,
        transport: rpcTransport,
        chain: celo,
    });

    const tools = await getOnChainTools({
        //@ts-ignore
        wallet: viem(walletClient),
        plugins: [esusu()],
    });
    const result = streamText({
        model: openai("gpt-4o-mini") as LanguageModel,
        system: `
      You are the official assistant for the Esusu protocol on the Celo blockchain.

      Connected User: ${userAddress}
      Chain: Celo (42220)

      FAUCET CONTRACT: 0xfEc76eB3B2d7713E626388b4E71464A7357a4F80
      USDT: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
      CELO: 0x471EcE3750Da237f93B8E339c536989b8978a438

      You can help users:
      1. Claim USDT from faucet (claimForMe with USDT address)
      2. Claim CELO from faucet (claimForMe with CELO address)
      3. Deposit tokens for Aave yields
      4. Submit onchain feedback for Agent #126

      When executing transactions, use sign_transaction tool.
      After successful transactions, ask if user wants to give feedback.
      Never fabricate transaction hashes.
    `,
        messages,
        //@ts-ignore
        tools: tools,
    });

    return result.toTextStreamResponse();
}