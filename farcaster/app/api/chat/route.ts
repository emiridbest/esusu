import { openai } from "@ai-sdk/openai";
// @ts-ignore - Version conflict with viem
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
// @ts-ignore - Version conflict with viem
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { LanguageModelV1, streamText } from 'ai';
import { NextResponse } from 'next/server';
// @ts-ignore - Optional import
import { esusu } from "@/agent/src";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Export the POST handler function for Next.js API route
export async function POST(req: Request) {
    try {
    const { messages, userAddress } = await req.json();

        const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
        const RPC_URL = process.env.RPC_PROVIDER_URL;
        if (!PRIVATE_KEY) {
            return NextResponse.json(
                { error: 'Server misconfigured: missing WALLET_PRIVATE_KEY' },
                { status: 500 }
            );
        }

        const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
        // Use Ankr RPC endpoint (can be overridden by RPC_PROVIDER_URL env var)
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
            // @ts-ignore
            wallet: viem(walletClient),
            plugins: [esusu()],
        });

        const result = streamText({
        model: openai("gpt-4o-mini") as LanguageModelV1,
            system: `You are a helpful agent that performs onchain transactions like claiming 0.03USDT for users who are on minipay or 0.1celo for users who are not on minipay via the Esusu faucet on the Celo blockchain. The connected user's address is ${userAddress}.
            Always ensure you are sending tokens to the correct address.
                Never send tokens to any address other than ${userAddress}.
                Always ensure you send only claim tokens to ${userAddress}.
                Never sent tokens to yourself.
                Never you confuse user address which is ${userAddress} with your own address which is ${account.address}.
                Your address is only used to sign transactions.
                If you are unsure about any request, ask for clarification instead of making assumptions.
                Your address is ${account.address}, and you must not send claimed tokens to this address, and you must not confuse this address with ${userAddress}.`,
            //@ts-ignore
            tools: tools,
            maxSteps: 20,
            messages
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
