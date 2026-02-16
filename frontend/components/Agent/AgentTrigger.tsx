"use client";

import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { celo } from "thirdweb/chains";
import { client } from "@/lib/thirdweb";
import { parseAbi, parseUnits } from "viem";

interface EsusuDepositProps {
    initialToken?: string;
    initialAmount?: string;
    onSuccess?: () => void;
}

export function EsusuDeposit({ initialToken, initialAmount, onSuccess }: EsusuDepositProps) {
    const account = useActiveAccount();
    const { mutateAsync: sendTransaction } = useSendTransaction();

    const [tokenSymbol, setTokenSymbol] = useState(initialToken || "USDT");
    const [amount, setAmount] = useState(initialAmount || "");
    const [status, setStatus] = useState("");
    const [error, setError] = useState<string | null>(null);

    const esusuAddress = "0xA590a71bA8E750aAC5726252E61a5172a48E35E1";

    const erc20Abi = parseAbi([
        "function approve(address spender, uint256 amount) external returns (bool)",
    ]);

    const esusuAbi = parseAbi([
        "function deposit(address tokenAddress, uint256 amount)",
    ]);

    const vaultContract = getContract({
        client,
        address: esusuAddress,
        chain: celo,
        abi: esusuAbi,
    });

    const getTokenAddress = (symbol: string) => {
        if (symbol === "USDT") return "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
        if (symbol === "cUSD") return "0x765DE816845861e75A25fCA122bb6898B8B1282e";
        if (symbol === "USDC") return "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
        return null;
    };

    const handleDeposit = useCallback(async () => {
        if (!account) {
            setError("Please connect your wallet");
            return;
        }

        try {
            setError(null);

            const tokenAddress = getTokenAddress(tokenSymbol);
            if (!tokenAddress) {
                setError("Invalid token selected");
                return;
            }

            const TOKENS: Record<string, { address: string; decimals: number }> = {
                USDT: { address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", decimals: 6 },
                cUSD: { address: "0x765DE816845861e75A25fCA122bb6898B8B1282e", decimals: 18 },
                USDC: { address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", decimals: 6 },
            };

            const token = TOKENS[tokenSymbol];
            if (!token) {
                setError("Invalid token selected");
                return;
            }

            const parsedAmount = parseUnits(amount, token.decimals);

            // STEP 1: APPROVE
            setStatus("Waiting for token approval...");

            const tokenContract = getContract({
                client,
                address: tokenAddress,
                chain: celo,
                abi: erc20Abi,
            });

            const approveTx = prepareContractCall({
                contract: tokenContract,
                method: "approve",
                params: [esusuAddress, parsedAmount],
            });

            await sendTransaction(approveTx);

            // STEP 2: DEPOSIT
            setStatus("Approval confirmed. Waiting for deposit confirmation...");

            const depositTx = prepareContractCall({
                contract: vaultContract,
                method: "deposit",
                params: [tokenAddress, parsedAmount],
            });

            const receipt = await sendTransaction(depositTx);

            setStatus(`✅ Deposit successful: ${receipt.transactionHash}`);
            
            // Call success callback
            if (onSuccess) {
                setTimeout(() => onSuccess(), 2000);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Transaction failed");
            setStatus("");
        }
    }, [account, amount, tokenSymbol, sendTransaction, vaultContract, onSuccess]);

    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-white rounded-lg">
            <h3 className="text-lg font-semibold">Deposit to Esusu</h3>
            
            <input
                type="text"
                placeholder="Token (USDT, cUSD, USDC)"
                className="border p-2 rounded w-full"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
            />

            <input
                type="text"
                placeholder="Amount"
                className="border p-2 rounded w-full"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />

            <button
                onClick={handleDeposit}
                disabled={!amount || !tokenSymbol}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded w-full font-semibold"
            >
                Deposit to Esusu
            </button>

            {status && <p className="text-green-600 text-sm">{status}</p>}
            {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
    );
}