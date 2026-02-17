"use client";

import { useState } from "react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useChat, type UseChatHelpers } from "@ai-sdk/react";
import type { ThirdwebAiMessage } from "@thirdweb-dev/ai-sdk-provider";
import { prepareTransaction, defineChain } from "thirdweb";
import { TransactionButton } from "thirdweb/react";
import { useActiveAccount } from "thirdweb/react";
import { client } from "@/lib/thirdweb";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send, User, Bot, Sparkles, RotateCcw, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { EsusuDeposit } from "@/components/Agent/AgentTrigger";
import { FeedbackForm } from "@/components/Agent/FeedbackForm";
import { v4 as uuidv4 } from "uuid";

// Generate a stable conversation ID
const CHAT_ID = uuidv4();

export default function Chat() {
    const account = useActiveAccount();
    const [showDepositForm, setShowDepositForm] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [waitingForFeedback, setWaitingForFeedback] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, sendMessage, addToolResult, status } =
        useChat<ThirdwebAiMessage>({
            transport: new DefaultChatTransport({
                api: "/api/chat",
                body: {
                    id: CHAT_ID,
                    userAddress: account?.address,
                }
            }),
            sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
            onFinish: (message) => {
                // Detect feedback request
                const text = message.messages
                    ?.filter((p: any) => p.type === "text")
                    ?.map((p: any) => p.text)
                    ?.join(" ")
                    ?.toLowerCase() || "";

                const feedbackKeywords = [
                    "was this helpful",
                    "rate this",
                    "give feedback",
                    "rate your experience",
                    "would you like to provide feedback",
                ];

                if (feedbackKeywords.some(k => text.includes(k))) {
                    setWaitingForFeedback(true);
                }

                // Show deposit form if AI mentions deposit
                const depositKeywords = [
                    "would you like to deposit",
                    "ready to deposit",
                    "proceed with deposit",
                ];
                if (depositKeywords.some(k => text.includes(k))) {
                    setShowDepositForm(true);
                }
            }
        });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Detect user saying yes to feedback
    useEffect(() => {
        if (!waitingForFeedback || messages.length === 0) return;
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role !== "user") return;

        const text = lastMessage.parts
            ?.filter((p: any) => p.type === "text")
            ?.map((p: any) => p.text)
            ?.join(" ")
            ?.toLowerCase()
            ?.trim() || "";

        if (["yes", "yeah", "yep", "sure", "ok", "y"].some(r => text === r || text.startsWith(r + " "))) {
            setShowFeedbackForm(true);
            setWaitingForFeedback(false);
        }
        if (["no", "nope", "nah", "n"].some(r => text === r)) {
            setWaitingForFeedback(false);
        }
    }, [messages, waitingForFeedback]);

    const isLoading = status === "streaming" || status === "submitted";

    return (
        <div className="max-w-4xl mx-auto h-screen flex flex-col">
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Messages */}
                <div className="flex-1 overflow-y-auto">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-6">
                                <Sparkles className="h-8 w-8 text-black" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">How can I help you today?</h2>
                            <p className="text-gray-500 max-w-md mb-8">
                                Ask me about Esusu services or managing your finances on Celo.
                            </p>
                            <div className="flex flex-col gap-3 w-full max-w-lg text-xs">
                                {[
                                    "How do I claim free gas fees?",
                                    "I want to save money and earn yield",
                                    "I want to give feedback on Agent #126",
                                    "What are the fees for using Esusu?",
                                ].map((suggestion) => (
                                    <Button
                                        key={suggestion}
                                        variant="outline"
                                        className="justify-start text-left p-4 h-auto"
                                        onClick={() => sendMessage({ text: suggestion })}
                                    >
                                        {suggestion}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="py-6 space-y-6">
                            {messages.map((message, i) => (
                                <MessageRenderer
                                    key={message.id}
                                    message={message}
                                    isLast={i === messages.length - 1}
                                    addToolResult={addToolResult}
                                    onShowDeposit={() => setShowDepositForm(true)}
                                    onShowFeedback={() => setShowFeedbackForm(true)}
                                    onReload={() => {}} // reload not directly available in new API
                                />
                            ))}

                            {isLoading && (
                                <div className="px-4 md:px-8 max-w-3xl mx-auto">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                                            <Bot className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
                                            <div className="flex gap-2 items-center">
                                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} className="pb-4" />
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="shrink-0 border-t dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
                    <ChatInput
                        onSend={(text) => sendMessage({ text })}
                        isLoading={isLoading}
                    />
                </div>
            </div>

            {/* Deposit Modal */}
            {showDepositForm && (
                <Modal title="💰 Deposit to Earn Yield" onClose={() => setShowDepositForm(false)}>
                    <EsusuDeposit
                        onSuccess={() => {
                            setShowDepositForm(false);
                            setTimeout(() => setWaitingForFeedback(true), 2000);
                        }}
                    />
                </Modal>
            )}

            {/* Feedback Modal */}
            {showFeedbackForm && (
                <Modal title="⭐ Submit Feedback Onchain" onClose={() => setShowFeedbackForm(false)}>
                    <FeedbackForm onSuccess={() => setShowFeedbackForm(false)} />
                </Modal>
            )}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageRenderer({
    message,
    isLast,
    addToolResult,
    onShowDeposit,
    onShowFeedback,
    onReload,
}: {
    message: ThirdwebAiMessage;
    isLast: boolean;
    addToolResult: UseChatHelpers<ThirdwebAiMessage>["addToolResult"];
    onShowDeposit: () => void;
    onShowFeedback: () => void;
    onReload: () => void;
}) {
    const isUser = message.role === "user";

    return (
        <div className={cn("px-4 md:px-8 max-w-3xl mx-auto", isUser ? "text-gray-900 dark:text-white" : "")}>
            <div className="flex items-start gap-4 mb-1">
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    isUser ? "bg-gray-600" : "bg-primary-600"
                )}>
                    {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                </div>

                <div className="flex-1 space-y-2">
                    {message.parts?.map((part: any, i: number) => {
                        // Text part
                        if (part.type === "text") {
                            const text = part.text || "";
                            const hasDeposit = text.toLowerCase().includes("deposit");
                            const hasFeedback = text.toLowerCase().includes("feedback") || text.toLowerCase().includes("rate");

                            return (
                                <div key={i}>
                                    <div className="prose dark:prose-invert max-w-none text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
                                        <ReactMarkdown>{text}</ReactMarkdown>
                                    </div>

                                    {/* Contextual action buttons */}
                                    {!isUser && (
                                        <div className="flex gap-2 mt-2 flex-wrap">
                                            {hasDeposit && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={onShowDeposit}
                                                >
                                                    💰 Open Deposit Form
                                                </Button>
                                            )}
                                            {hasFeedback && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                                    onClick={onShowFeedback}
                                                >
                                                    ⭐ Give Feedback
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Transaction signing part ← THE KEY NEW FEATURE
                        if (part.type === "tool-sign_transaction") {
                            const txData = part.input;
                            return (
                                <div key={i} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
                                        🔐 Transaction Signature Required
                                    </p>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 space-y-1">
                                        <p><span className="font-medium">To:</span> {txData.to}</p>
                                        <p><span className="font-medium">Chain:</span> Celo ({txData.chain_id})</p>
                                        {txData.value && txData.value !== "0" && (
                                            <p><span className="font-medium">Value:</span> {txData.value}</p>
                                        )}
                                    </div>
                                    <TransactionButton
                                        transaction={() =>
                                            prepareTransaction({
                                                client,
                                                chain: defineChain(txData.chain_id),
                                                to: txData.to,
                                                data: txData.data,
                                                value: txData.value ? BigInt(txData.value) : undefined,
                                            })
                                        }
                                        onTransactionSent={(tx) => {
                                            addToolResult({
                                                tool: "sign_transaction",
                                                toolCallId: part.toolCallId,
                                                output: {
                                                    transaction_hash: tx.transactionHash,
                                                    chain_id: txData.chain_id,
                                                },
                                            });
                                        }}
                                        onError={(error) => {
                                            console.error("Transaction error:", error);
                                        }}
                                        className="w-full bg-primary text-white rounded-lg py-2 text-sm font-semibold"
                                    >
                                        ✅ Sign & Execute Transaction
                                    </TransactionButton>
                                </div>
                            );
                        }

                        // Transaction monitoring part
                        if (part.type === "tool-monitor_transaction") {
                            return (
                                <div key={i} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        Monitoring transaction...
                                    </p>
                                </div>
                            );
                        }

                        return null;
                    })}
                </div>
            </div>
        </div>
    );
}

function ChatInput({ onSend, isLoading }: { onSend: (text: string) => void; isLoading: boolean }) {
    const [input, setInput] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSend(input.trim());
            setInput("");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="relative">
                <Input
                    className="pr-12 py-6 pl-4 text-black dark:text-gray-400 bg-white dark:bg-gray-900 border-2 dark:border-gray-700 rounded-xl"
                    placeholder="Message Esusu Assistant..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                />
                <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary-700 text-black rounded-lg h-9 w-9"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
            <p className="text-xs text-center mt-2 text-gray-500">
                Esusu Assistant can make mistakes. Consider checking important information.
            </p>
        </form>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}