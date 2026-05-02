"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSendTransaction } from "wagmi";
import { parseAbi, keccak256, toBytes, getContract } from "viem";
import { createPublicClient, http } from 'viem';
import { celo as celoChain } from 'viem/chains';

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
    const { address: walletAddress, isConnected } = useAccount();
    const { sendTransaction } = useSendTransaction();

    const AGENT_ID = 126;
    const AGENT_ADDRESS = "0x4d4cC2E0c5cBC9737A0dEc28d7C2510E2BEF5A09";

    const [value, setValue] = useState(initialData?.value?.toString() || "");
    const [tag1, setTag1] = useState(initialData?.tag1 || "");
    const [tag2, setTag2] = useState(initialData?.tag2 || "");
    const [endpoint, setEndpoint] = useState(initialData?.endpoint || "https://esusuafrica.com/api/chat");
    const [feedbackText, setFeedbackText] = useState("");
    const [feedbackURI, setFeedbackURI] = useState(initialData?.feedbackURI || "");
    const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);
    const [isFetchingTx, setIsFetchingTx] = useState(false);
    const [status, setStatus] = useState("");
    const [error, setError] = useState<string | null>(null);

    const REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";

    const reputationAbi = parseAbi([
        "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external"
    ]);

    const publicClient = useCallback(() => createPublicClient({
        chain: celoChain,
        transport: http(),
    }), [])();

    const fetchLastTransaction = useCallback(async () => {
        setIsFetchingTx(true);
        setError(null);
        try {
            const LOOKBACK_SECONDS = 2 * 60 * 60;
            const MAX_LOOKBACK_BLOCKS = 5000;
            const currentBlock = await publicClient.getBlockNumber();
            const currentBlockData = await publicClient.getBlock({ blockNumber: currentBlock, includeTransactions: false });
            const cutoffTimestamp = Number(currentBlockData.timestamp) - LOOKBACK_SECONDS;
            const startBlock = currentBlock > BigInt(MAX_LOOKBACK_BLOCKS) ? currentBlock - BigInt(MAX_LOOKBACK_BLOCKS) : 0n;

            for (let i = currentBlock; i >= startBlock; i--) {
                const block = await publicClient.getBlock({ blockNumber: i, includeTransactions: true });
                if (Number(block.timestamp) < cutoffTimestamp) break;
                if (block.transactions && Array.isArray(block.transactions)) {
                    const agentTxs = block.transactions.filter((tx: any) =>
                        typeof tx === "object" && tx.from && tx.from.toLowerCase() === AGENT_ADDRESS.toLowerCase()
                    );
                    if (agentTxs.length > 0) {
                        const lastTx: any = agentTxs[agentTxs.length - 1];
                        setLastTxHash(lastTx.hash as `0x${string}`);
                        return lastTx.hash;
                    }
                }
            }
            return null;
        } catch (err: any) {
            console.error("Error fetching last transaction:", err);
            return null;
        } finally {
            setIsFetchingTx(false);
        }
    }, [publicClient]);

    useEffect(() => { fetchLastTransaction(); }, [fetchLastTransaction]);

    const handleSubmitFeedback = useCallback(async () => {
        if (!walletAddress) { setError("Please connect your wallet"); return; }
        try {
            setError(null);
            setStatus("Preparing feedback transaction...");
            const numValue = parseInt(value);
            if (!value || isNaN(numValue) || numValue < 0 || numValue > 100) { setError("Rating must be between 0 and 100"); return; }
            if (!tag1 || !feedbackText) { setError("Please fill in all required fields"); return; }

            let feedbackHash: `0x${string}` = lastTxHash || keccak256(toBytes(feedbackText));
            let finalFeedbackURI = feedbackURI || `ipfs://feedback-${AGENT_ID}-${Date.now()}`;

            try {
                const feedbackData = { agentId: AGENT_ID, rating: numValue, tag1, tag2: tag2 || "", feedback: feedbackText, txHash: lastTxHash || "", timestamp: new Date().toISOString(), user: walletAddress };
                const res = await fetch("/api/pinata-upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedbackData }) });
                if (res.ok) { const { cid } = await res.json(); finalFeedbackURI = `ipfs.io/ipfs/${cid}`; setFeedbackURI(finalFeedbackURI); }
            } catch (pinataErr) { console.error("Pinata upload failed:", pinataErr); }

            setStatus("Please sign the transaction in your wallet...");
            setValue(""); setTag1(""); setTag2(""); setEndpoint("https://esusuafrica.com/api/chat"); setFeedbackText(""); setFeedbackURI("https://ipfs.io/ipfs/bafkreidu2varspzsdamdmtrddtwidz5myyr42i2l3jbxiw7r4zbk3ttese");
            if (onSuccess) setTimeout(() => onSuccess(), 3000);
        } catch (err: any) {
            console.error("Error submitting feedback:", err);
            setError(err.message || "Failed to submit feedback");
            setStatus("");
        }
    }, [walletAddress, value, tag1, tag2, endpoint, feedbackText, feedbackURI, lastTxHash, sendTransaction, onSuccess]);

    return (
        <div className="flex flex-col space-y-4 p-4 sm:p-6 bg-white rounded-lg shadow w-full max-w-2xl mx-auto">
            {/* Header */}
            <h3 className="text-lg sm:text-xl font-bold">Submit Feedback for Esusu AI Agent</h3>

            {/* Agent Transaction Info */}
            {isFetchingTx ? (
                <div className="bg-white border border-gray-300 p-3 rounded flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black flex-shrink-0" />
                    <p className="text-black text-xs sm:text-sm">Fetching last transaction by Esusu AI Agent...</p>
                </div>
            ) : lastTxHash ? (
                <div className="bg-green-50 border border-green-200 p-3 rounded">
                    <p className="text-green-700 text-xs sm:text-sm font-medium mb-1">✓ Using Agent Transaction Hash</p>
                    {/* Truncate hash on mobile, show full on sm+ */}
                    <p className="text-green-600 text-xs font-mono break-all leading-relaxed">
                        <span className="sm:hidden">{lastTxHash.slice(0, 18)}...{lastTxHash.slice(-6)}</span>
                        <span className="hidden sm:block">{lastTxHash}</span>
                    </p>
                </div>
            ) : null}

            {/* Rating Slider */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    Rating: <span className="font-bold">{value || 0}</span>/100{" "}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    type="range" min="0" max="100" step="1"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                    value={value || 0}
                    onChange={(e) => setValue(e.target.value)}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0 (Poor)</span>
                    <span>50 (Average)</span>
                    <span>100 (Excellent)</span>
                </div>
            </div>

            {/* Rating Number Input */}
            <div>
                <label className="block text-sm font-medium mb-1">Or enter rating directly:</label>
                <input
                    type="number" placeholder="Enter 0-100" min="0" max="100"
                    className="w-full p-2 border rounded text-sm"
                    value={value}
                    onChange={(e) => { const val = parseInt(e.target.value); if (val >= 0 && val <= 100) setValue(e.target.value); }}
                />
            </div>

            {/* Tags — stacked on mobile, side-by-side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Category <span className="text-red-500">*</span>
                    </label>
                    <select
                        className="w-full p-2 border rounded text-sm bg-white"
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
                    <label className="block text-sm font-medium mb-1">Sub-category <span className="text-gray-400 text-xs">(optional)</span></label>
                    <input
                        type="text" placeholder="e.g., response time"
                        className="w-full p-2 border rounded text-sm"
                        value={tag2}
                        onChange={(e) => setTag2(e.target.value)}
                    />
                </div>
            </div>

            {/* Feedback Text */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Feedback Details <span className="text-red-500">*</span>
                    <span className="block sm:inline text-gray-400 text-xs sm:ml-2">
                        {lastTxHash ? "(Agent tx hash will be used)" : "(Will be hashed and stored onchain)"}
                    </span>
                </label>
                <textarea
                    placeholder="Make it short... This will help improve the agent."
                    className="w-full p-3 border rounded h-28 sm:h-32 resize-none text-sm"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    maxLength={100}
                />
                <div className="text-xs text-gray-500 text-right">{feedbackText.length}/100 characters</div>
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmitFeedback}
                disabled={!value || !tag1 || !feedbackText || isFetchingTx}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold w-full transition-colors text-sm sm:text-base"
            >
                📝 Submit Feedback Onchain
            </button>

            {/* Status Messages */}
            {status && (
                <div className={`border p-3 rounded ${status.includes('✅') ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`text-xs sm:text-sm break-all ${status.includes('✅') ? 'text-green-700' : 'text-blue-700'}`}>{status}</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <p className="text-red-700 text-xs sm:text-sm">❌ {error}</p>
                </div>
            )}

            {/* Helper Text */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded text-xs text-gray-600 space-y-1">
                <p className="font-semibold">ℹ️ How it works:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Rate Agent Esusu AI from 0 (poor) to 100 (excellent)</li>
                    <li>Please be nice...lol</li>
                </ul>
            </div>
        </div>
    );
}