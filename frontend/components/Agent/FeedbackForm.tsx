"use client";

import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { celo } from "thirdweb/chains";
import { client } from "@/lib/thirdweb";
import { parseAbi, keccak256, toBytes } from "viem";

interface FeedbackFormProps {
    initialData?: {
        agentId?: number;
        value?: number;
        tag1?: string;
        tag2?: string;
        endpoint?: string;
        feedbackURI?: string;
    };
    onSuccess?: () => void;
}

export function FeedbackForm({ initialData, onSuccess }: FeedbackFormProps) {
    const account = useActiveAccount();
    const { mutateAsync: sendTransaction } = useSendTransaction();

    // Form state
    const [agentId, setAgentId] = useState(initialData?.agentId?.toString() || "");
    const [value, setValue] = useState(initialData?.value?.toString() || "");
    const [valueDecimals, setValueDecimals] = useState("0");
    const [tag1, setTag1] = useState(initialData?.tag1 || "");
    const [tag2, setTag2] = useState(initialData?.tag2 || "");
    const [endpoint, setEndpoint] = useState(initialData?.endpoint || "");
    const [feedbackText, setFeedbackText] = useState("");
    const [feedbackURI, setFeedbackURI] = useState(initialData?.feedbackURI || "");

    const [status, setStatus] = useState("");
    const [error, setError] = useState<string | null>(null);

    const REPUTATION_REGISTRY = "0x..."; // ✅ YOUR CONTRACT ADDRESS

    const reputationAbi = parseAbi([
        "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external"
    ]);

    const contract = getContract({
        client,
        address: REPUTATION_REGISTRY,
        chain: celo,
        abi: reputationAbi,
    });

    const handleSubmitFeedback = useCallback(async () => {
        if (!account) {
            setError("Please connect your wallet");
            return;
        }

        try {
            setError(null);
            setStatus("Preparing feedback transaction...");

            // Validate inputs
            if (!agentId || !value || !tag1 || !endpoint || !feedbackText) {
                setError("Please fill in all required fields");
                return;
            }

            // Generate feedback hash from text
            const feedbackHash = keccak256(toBytes(feedbackText));
            console.log("Generated feedback hash:", feedbackHash);

            // Prepare transaction
            const transaction = prepareContractCall({
                contract,
                method: "giveFeedback",
                params: [
                    BigInt(agentId),
                    BigInt(value),
                    parseInt(valueDecimals),
                    tag1,
                    tag2 || "",
                    endpoint,
                    feedbackURI || `ipfs://feedback-${agentId}-${Date.now()}`,
                    feedbackHash
                ]
            });

            setStatus("Please sign the transaction in your wallet...");

            // Execute transaction
            const receipt = await sendTransaction(transaction);

            setStatus(`✅ Feedback submitted successfully!`);
            console.log("Transaction hash:", receipt.transactionHash);

            // Call success callback
            if (onSuccess) {
                setTimeout(() => onSuccess(), 2000);
            }
        } catch (err: any) {
            console.error("Error submitting feedback:", err);
            setError(err.message || "Failed to submit feedback");
            setStatus("");
        }
    }, [
        account,
        agentId,
        value,
        valueDecimals,
        tag1,
        tag2,
        endpoint,
        feedbackText,
        feedbackURI,
        sendTransaction,
        contract,
        onSuccess
    ]);

    return (
        <div className="flex flex-col space-y-4 p-6 bg-white rounded-lg shadow">
            <h3 className="text-xl font-bold">Submit Onchain Feedback</h3>

            {/* Agent ID */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Agent ID <span className="text-red-500">*</span>
                </label>
                <input
                    type="number"
                    placeholder="e.g., 1"
                    className="w-full p-2 border rounded"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                />
            </div>

            {/* Feedback Value */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Feedback Value <span className="text-red-500">*</span>
                    <span className="text-gray-500 text-xs ml-2">(Can be negative)</span>
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="e.g., 100 or -50"
                        className="flex-1 p-2 border rounded"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                    <input
                        type="number"
                        placeholder="Decimals"
                        className="w-24 p-2 border rounded"
                        value={valueDecimals}
                        onChange={(e) => setValueDecimals(e.target.value)}
                        min="0"
                        max="18"
                    />
                </div>
            </div>

            {/* Tags */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Primary Tag <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="e.g., performance"
                        className="w-full p-2 border rounded"
                        value={tag1}
                        onChange={(e) => setTag1(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Secondary Tag
                    </label>
                    <input
                        type="text"
                        placeholder="e.g., accuracy"
                        className="w-full p-2 border rounded"
                        value={tag2}
                        onChange={(e) => setTag2(e.target.value)}
                    />
                </div>
            </div>

            {/* Endpoint */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Endpoint <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    placeholder="e.g., api.example.com/feedback"
                    className="w-full p-2 border rounded"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                />
            </div>

            {/* Feedback Text */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Feedback Content <span className="text-red-500">*</span>
                    <span className="text-gray-500 text-xs ml-2">(Will be hashed onchain)</span>
                </label>
                <textarea
                    placeholder="Write your detailed feedback here..."
                    className="w-full p-2 border rounded h-32"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                />
            </div>

            {/* Feedback URI (optional) */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Feedback URI (optional)
                    <span className="text-gray-500 text-xs ml-2">(IPFS or external link)</span>
                </label>
                <input
                    type="text"
                    placeholder="ipfs://... or https://..."
                    className="w-full p-2 border rounded"
                    value={feedbackURI}
                    onChange={(e) => setFeedbackURI(e.target.value)}
                />
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmitFeedback}
                disabled={!agentId || !value || !tag1 || !endpoint || !feedbackText}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-3 rounded font-semibold w-full"
            >
                Submit Feedback Onchain
            </button>

            {/* Status Messages */}
            {status && (
                <div className="bg-green-50 border border-green-200 p-3 rounded">
                    <p className="text-green-700 text-sm">{status}</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {/* Helper Text */}
            <div className="bg-gray-50 p-3 rounded text-xs text-gray-600">
                <p className="font-semibold mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Your feedback text will be hashed using keccak256</li>
                    <li>The hash ensures content integrity onchain</li>
                    <li>You can optionally provide a URI for full feedback details</li>
                    <li>Transaction requires your wallet signature</li>
                </ul>
            </div>
        </div>
    );
}