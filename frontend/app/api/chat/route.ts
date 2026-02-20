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

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'Esusu AI Chat API is running',
        version: '1.0.0',
        usage: 'Send a POST request with { "messages": [...] } to interact with the AI agent',
        timestamp: new Date().toISOString(),
    });
}

export async function POST(req: Request) {
    try {
        const { messages: rawMessages, userAddress } = await req.json();

        console.log("Raw messages received:", JSON.stringify(rawMessages, null, 2));

        // Aggressively filter and simplify messages to avoid AI SDK conversion errors
        // The AI SDK requires all tool invocations to have results
        const messages = rawMessages.map((msg: any) => {
            // For user messages, just keep role and content
            if (msg.role === 'user') {
                return {
                    role: 'user',
                    content: msg.content || ''
                };
            }
            
            // For assistant messages, handle tool invocations carefully
            if (msg.role === 'assistant') {
                // Check if there are any incomplete tool invocations
                const hasIncompleteTools = msg.toolInvocations?.some(
                    (inv: any) => inv.state !== 'result'
                );
                
                if (hasIncompleteTools) {
                    // If there are incomplete tools, just return the text content
                    // This loses tool info but avoids the error
                    return {
                        role: 'assistant',
                        content: msg.content || ''
                    };
                }
                
                // If all tools are complete, keep the full message
                if (msg.toolInvocations && msg.toolInvocations.length > 0) {
                    return {
                        role: 'assistant',
                        content: msg.content || '',
                        toolInvocations: msg.toolInvocations.filter(
                            (inv: any) => inv.state === 'result'
                        )
                    };
                }
                
                return {
                    role: 'assistant',
                    content: msg.content || ''
                };
            }
            
            // For tool messages
            if (msg.role === 'tool') {
                return msg;
            }
            
            return msg;
        }).filter((msg: any) => {
            // Remove empty assistant messages
            if (msg.role === 'assistant' && !msg.content && !msg.toolInvocations?.length) {
                return false;
            }
            return true;
        });

        console.log("Filtered messages:", JSON.stringify(messages, null, 2));


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
            : http('https://forno.celo.org', {
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

            1. claimUsdtForUser(recipient, usdtAddress) ==> You disburse 0.03 USDT to ${userAddress} using this tool.
            2. claimCeloForUser(recipient, celoAddress) ==> You disburse 0.01 CELO to ${userAddress} using this tool.
            3. whitelistUserForClaims(userAddress) ==> you are to whitelist ${userAddress}. Never whitelist ${account.address} or any other address. Always whitelist ${userAddress}.
            4. getFaucetBalance()
            5. getTimeUntilNextClaim(userAddress)

            Rules:
            - Execute immediately when user intent matches
            - Broadcast transaction and return real hash
            - Use ${userAddress} as recipient

            --------------------------------------------------
            DEPOSIT TO ESUSU
            --------------------------------------------------

            When user requests deposit:
            - Reply with: "Please click the deposit button to proceed."
            - The frontend will display a deposit button for user interaction
            - Do NOT call any tools for deposits
            - The frontend handles the entire deposit flow

            --------------------------------------------------
            FEEDBACK RULES
            --------------------------------------------------

            Feedback is handled entirely by the frontend — there is NO tool for it.
            When the user asks to give feedback, or after every transaction, simply reply with a text message like:
            "Was this helpful? Please reply with 'Yes' or 'No' and any comments you have."
            Do NOT call any tools for feedback. Just respond with plain text.
            The frontend will detect the keywords and show a feedback form automatically.
            
            --------------------------------------------------
            RESPONSE RULES
            --------------------------------------------------

            For agent-signed transactions:
            - Execute and return real transaction hash

            For deposits:
            - Tell user to click the deposit button
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
        console.log('Error details:', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
        });
        return NextResponse.json(
            { error: error?.message || 'Internal server error' },
            { status: 500 }
        );
    }
}