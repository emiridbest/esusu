"use client";

import { useState } from "react";
import { useChat } from "ai/react";
import { useAccount, useSendTransaction } from "wagmi";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send, User, Bot, Sparkles, RotateCcw, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { FeedbackForm } from "@/components/Agent/FeedbackForm";
import { FaceVerification } from "@/components/Agent/faceVerification";
import { v4 as uuidv4 } from "uuid";
import type { Message } from "ai";

// Generate a stable conversation ID
const CHAT_ID = uuidv4();

export default function Chat() {
    const { address: walletAddress, isConnected } = useAccount();
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [showFaceVerification, setShowFaceVerification] = useState(false);
    const [waitingForFeedback, setWaitingForFeedback] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { messages, input, setInput, handleSubmit, isLoading, append } = useChat({
        api: "/api/chat",
        body: { userAddress: walletAddress },
        id: CHAT_ID,
        onFinish: (message) => {
            const text = message.content?.toLowerCase() || "";

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

            const faceVerificationKeywords = [
                "please complete face verification",
                "face verification required",
                "Please click the face verification button to proceed",

            ];
            if (faceVerificationKeywords.some(k => text.includes(k))) {
                setShowFaceVerification(true);
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

        const text = lastMessage.content?.toLowerCase()?.trim() || "";

        if (["yes", "yeah", "yep", "sure", "ok", "y"].some(r => text === r || text.startsWith(r + " "))) {
            setShowFeedbackForm(true);
            setWaitingForFeedback(false);
        }
        if (["no", "nope", "nah", "n"].some(r => text === r)) {
            setWaitingForFeedback(false);
        }
    }, [messages, waitingForFeedback]);

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
                                    "I want to give feedback on Esusu AI Agent",
                                    "What are the fees for using Esusu?",
                                ].map((suggestion) => (
                                    <Button
                                        key={suggestion}
                                        variant="outline"
                                        className="justify-start text-left p-4 h-auto text-black/90 dark:text-white/90"
                                        onClick={() => append({ role: "user", content: suggestion })}
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
                                    onShowFeedback={() => setShowFeedbackForm(true)}
                                    onShowFaceVerification={() => setShowFaceVerification(true)}
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
                        input={input}
                        setInput={setInput}
                        handleSubmit={handleSubmit}
                        isLoading={isLoading}
                    />
                </div>
            </div>



            {/* Feedback Modal */}
            {showFeedbackForm && (
                <Modal title="⭐ Submit Feedback Onchain" onClose={() => setShowFeedbackForm(false)}>
                    <FeedbackForm onSuccess={() => setShowFeedbackForm(false)} />
                </Modal>
            )}

            {/* Face Verification Modal */}
            {showFaceVerification && (
                <Modal title="🛡️ Face Verification" onClose={() => setShowFaceVerification(false)}>
                    <FaceVerification onSuccess={() => setShowFaceVerification(false)} />
                </Modal>
            )}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageRenderer({
    message,
    isLast,
    onShowFeedback,
    onShowFaceVerification,
    onReload,
}: {
    message: Message;
    isLast: boolean;
    onShowFeedback: () => void;
    onShowFaceVerification: () => void;
    onReload: () => void;
}) {
    const isUser = message.role === "user";
    const text = message.content || "";
    const hasFeedback = text.toLowerCase().includes("feedback") || text.toLowerCase().includes("rate");
    const hasFaceVerification = text.toLowerCase().includes("face verification button");

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
                    <div className="prose dark:prose-invert max-w-none text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
                        <ReactMarkdown>{text}</ReactMarkdown>
                    </div>

                    {/* Contextual action buttons */}
                    {!isUser && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                            {hasFaceVerification && (
                                <Button
                                    size="sm"
                                    className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                                    onClick={onShowFaceVerification}
                                >
                                    🛡️ Face Verification Button
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

                    {/* Tool invocations */}
                    {message.toolInvocations?.map((tool, i) => (
                        <div key={i} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                🔧 {tool.toolName}: {tool.state === 'result' ? String(tool.result) : 'Processing...'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ChatInput({ 
    input, 
    setInput, 
    handleSubmit, 
    isLoading 
}: { 
    input: string;
    setInput: (value: string) => void;
    handleSubmit: (e: React.FormEvent) => void;
    isLoading: boolean;
}) {
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