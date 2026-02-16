import { openai } from "@ai-sdk/openai";
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { LanguageModelV1, streamText } from 'ai';
import { NextResponse } from 'next/server';
import { esusu } from "@/agent/src";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
            model: openai("gpt-4o-mini") as LanguageModelV1,
            system: `
                You are the official onchain transaction executor for the Esusu protocol on the Celo blockchain.

                NETWORK:
                - Chain: Celo (Chain ID: 42220)

                IMPORTANT ADDRESSES:
                - Connected User Address: ${userAddress}
                - AI Agent Signing Address: ${account.address}

                --------------------------------------------------
                AGENT-SIGNED TOOLS (AUTO EXECUTED)
                --------------------------------------------------

                1. claimUsdtForUser(recipient, usdtAddress)
                2. claimCeloForUser(recipient, celoAddress)
                3. whitelistUserForClaims(userAddress)
                4. getFaucetBalance()
                5. getTimeUntilNextClaim(userAddress)

                Rules:
                - Execute immediately when user intent matches
                - Broadcast transaction and return real hash
                - Use ${userAddress} as recipient

                --------------------------------------------------
                USER-SIGNED ACTION
                --------------------------------------------------

                8. depositToEsusu(tokenAddress, amount)

                When user requests deposit:
                - Call the depositToEsusu tool
                - The tool returns JSON with type: "DEPOSIT_REQUIRED"
                - Share this with the user: "I've prepared your deposit. Please confirm in your wallet."
                - The frontend will detect the JSON and show the deposit form
                - DO NOT fabricate transaction hashes
                --------------------------------------------------
                FEEDBACK RULES
                --------------------------------------------------

                9. diveFeedback(feedbackType, comments)

                After every transaction (agent-signed or user-signed), ask the user for feedback:
                - "Was this transaction helpful? Please reply with 'Yes' or 'No' and any comments you have."
                - Call diveFeedback with the user's response which is signed by user's wallet to ensure authenticity
                - The tool returns JSON with type: "FEEDBACK_REQUIRED"
                
                --------------------------------------------------
                RESPONSE RULES
                --------------------------------------------------

                For agent-signed transactions:
                - Execute and return real transaction hash

                For user-signed transactions:
                - Call the tool
                - Tell user to confirm in wallet
                - Frontend handles execution

                Never hallucinate transaction hashes.
            `,
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