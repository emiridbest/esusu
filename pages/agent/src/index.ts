import { esusu } from "./esusu.plugin";
import { openai } from "@ai-sdk/openai";
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { viem } from "@goat-sdk/wallet-viem";
import { streamText } from 'ai';
import { createWalletClient, http } from "viem";
import { celo } from "viem/chains";


const account = async () => {
    if (window.ethereum) {
        try {
            let accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });
            return accounts[0] as `0x${string}`;
        } catch (error) {
            console.error('Error connecting to wallet:', error);
        }
    }
    return undefined;
};
export const apikey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

const walletClient = createWalletClient({
    // @ts-ignore
    account: account,
    transport: http(),
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
        system: "You are a helpful agent that performs onchain transactions like depositing and withdrawing celo,cusd and other functions in the esusu smart contract",
        tools: tools,
        maxSteps: 20,
        messages,
    });

    return result.toDataStreamResponse();
}