"use client";

import { useState, useCallback } from "react";
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { celo } from "thirdweb/chains";
import { client } from "@/lib/thirdweb";
import { parseAbi, keccak256, toBytes } from "viem";

interface FeedbackFormProps {
    initialData?: {
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

    // Fixed agent ID
    const AGENT_ID = 126;

    // Form state
    const [value, setValue] = useState(initialData?.value?.toString() || "");
    const [tag1, setTag1] = useState(initialData?.tag1 || "");
    const [tag2, setTag2] = useState(initialData?.tag2 || "");
    const [endpoint, setEndpoint] = useState(initialData?.endpoint || "");
    const [feedbackText, setFeedbackText] = useState("");
    const [feedbackURI, setFeedbackURI] = useState(initialData?.feedbackURI || "");

    const [status, setStatus] = useState("");
    const [error, setError] = useState<string | null>(null);

    const REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63"; 

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
            const numValue = parseInt(value);
            if (!value || isNaN(numValue) || numValue < 0 || numValue > 100) {
                setError("Rating must be between 0 and 100");
                return;
            }

            if (!tag1 || !endpoint || !feedbackText) {
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
                    BigInt(AGENT_ID),  // Fixed agent ID
                    BigInt(numValue),   // Rating 0-100
                    0,                  // No decimals (integer rating)
                    tag1,
                    tag2 || "",
                    endpoint,
                    feedbackURI || `ipfs://feedback-${AGENT_ID}-${Date.now()}`,
                    feedbackHash
                ]
            });

            setStatus("Please sign the transaction in your wallet...");

            // Execute transaction
            const receipt = await sendTransaction(transaction);

            setStatus(`Feedback submitted successfully! Transaction: ${receipt.transactionHash}`);
            console.log("Transaction hash:", receipt.transactionHash);

            // Reset form
            setValue("");
            setTag1("");
            setTag2("");
            setEndpoint("");
            setFeedbackText("");
            setFeedbackURI("");

            // Call success callback
            if (onSuccess) {
                setTimeout(() => onSuccess(), 3000);
            }
        } catch (err: any) {
            console.error("Error submitting feedback:", err);
            setError(err.message || "Failed to submit feedback");
            setStatus("");
        }
    }, [
        account,
        value,
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
        <div className="flex flex-col space-y-4 p-6 bg-white rounded-lg shadow max-w-2xl mx-auto">
            <h3 className="text-xl font-bold">Submit Feedback for Agent #{AGENT_ID}</h3>

            {/* Rating Slider */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    Rating: {value || 0}/100 <span className="text-red-500">*</span>
                </label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    value={value || 0}
                    onChange={(e) => setValue(e.target.value)}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0 (Poor)</span>
                    <span>50 (Average)</span>
                    <span>100 (Excellent)</span>
                </div>
            </div>

            {/* Rating Number Input (alternative) */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Or enter rating directly:
                </label>
                <input
                    type="number"
                    placeholder="Enter 0-100"
                    className="w-full p-2 border rounded"
                    value={value}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= 0 && val <= 100) {
                            setValue(e.target.value);
                        }
                    }}
                    min="0"
                    max="100"
                />
            </div>

            {/* Tags */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Category <span className="text-red-500">*</span>
                    </label>
                    <select
                        className="w-full p-2 border rounded"
                        value={tag1}
                        onChange={(e) => setTag1(e.target.value)}
                    >
                        <option value="">Select category...</option>
                        <option value="performance">Performance</option>
                        <option value="accuracy">Accuracy</option>
                        <option value="helpfulness">Helpfulness</option>
                        <option value="reliability">Reliability</option>
                        <option value="speed">Speed</option>
                        <option value="quality">Quality</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Sub-category (optional)
                    </label>
                    <input
                        type="text"
                        placeholder="e.g., response time"
                        className="w-full p-2 border rounded"
                        value={tag2}
                        onChange={(e) => setTag2(e.target.value)}
                    />
                </div>
            </div>

            {/* Endpoint */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Service/Endpoint <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    placeholder="e.g., esusu-faucet or api.esusu.com"
                    className="w-full p-2 border rounded"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                />
            </div>

            {/* Feedback Text */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Feedback Details <span className="text-red-500">*</span>
                    <span className="text-gray-500 text-xs ml-2">(Will be hashed and stored onchain)</span>
                </label>
                <textarea
                    placeholder="Write your detailed feedback here... This will help improve the agent."
                    className="w-full p-3 border rounded h-32 resize-none"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    maxLength={500}
                />
                <div className="text-xs text-gray-500 text-right">
                    {feedbackText.length}/500 characters
                </div>
            </div>

            {/* Feedback URI (optional) */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Additional Data URI (optional)
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
                disabled={!value || !tag1 || !endpoint || !feedbackText}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold w-full transition-colors"
            >
                📝 Submit Feedback Onchain
            </button>

            {/* Status Messages */}
            {status && (
                <div className={`border p-3 rounded ${
                    status.includes('✅') ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
                }`}>
                    <p className={`text-sm ${
                        status.includes('✅') ? 'text-green-700' : 'text-blue-700'
                    }`}>
                        {status}
                    </p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <p className="text-red-700 text-sm">❌ {error}</p>
                </div>
            )}

            {/* Helper Text */}
            <div className="bg-gray-50 p-4 rounded text-xs text-gray-600 space-y-2">
                <p className="font-semibold">ℹ️ How it works:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Rate Agent Esusu  AI from 0 (poor) to 100 (excellent)</li>
                    <li>Please be nice...lol</li>
                </ul>
            </div>
        </div>
    );
}