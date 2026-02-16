"use client";
import { useChat, Message } from "ai/react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send, User, Bot, Sparkles, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetStateAction, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useActiveAccount } from "thirdweb/react";
import { EsusuDeposit } from "@/components/Agent/AgentTrigger";
import { FeedbackForm } from "@/components/Agent/FeedbackForm";

export default function Chat() {
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showDepositForm, setShowDepositForm] = useState(false);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [depositData, setDepositData] = useState(null);
    const [feedbackData, setFeedbackData] = useState(null);
    const account = useActiveAccount();

    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        reload,
        setMessages,
    } = useChat({
        api: "/api/chat",
        body: {
            userAddress: account?.address || null,
        },
        onFinish: (message) => {
            try {
                const content = message.content;
                
                // Check for deposit instruction
                if (content.includes('DEPOSIT_REQUIRED')) {
                    const jsonMatch = content.match(/\{[^}]*"type":\s*"DEPOSIT_REQUIRED"[^}]*\}/);
                    if (jsonMatch) {
                        const data = JSON.parse(jsonMatch[0]);
                        setDepositData(data);
                        setShowDepositForm(true);
                    }
                }
                
                // Check for feedback instruction
                if (content.includes('FEEDBACK_REQUIRED')) {
                    const jsonMatch = content.match(/\{[^}]*"type":\s*"FEEDBACK_REQUIRED"[^}]*\}/);
                    if (jsonMatch) {
                        setFeedbackData(JSON.parse(jsonMatch[0]));
                        setShowFeedbackForm(true);
                    }
                }
            } catch (error) {
                console.error("Error parsing AI response:", error);
            }
        },
        onError: (error: { message: SetStateAction<string | null> }) => {
            setError(error.message);
        },
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleNewChat = () => {
        setMessages([]);
        setSelectedChat(null);
        setError(null);
    };

    return (
        <div className="max-w-4xl mx-auto h-screen flex flex-col">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto">
                    {error && (
                        <div className="p-4 m-4 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            {error}
                            <Button
                                onClick={() => setError(null)}
                                variant="outline"
                                size="sm"
                                className="ml-2"
                            >
                                Dismiss
                            </Button>
                        </div>
                    )}

                    {messages.length === 0 && !error ? (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-primary dark:bg-primary flex items-center justify-center mb-6">
                                <Sparkles className="h-8 w-8 text-black dark:text-primary-400" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-black dark:text-white/90">
                                How can I help you today?
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                                Ask me about Esusu services, managing your finances, or how to use the platform.
                            </p>
                            <div className="flex flex-col gap-3 w-full max-w-lg dark:text-gray-400 text-xs">
                                <Button
                                    variant="outline"
                                    className="justify-start text-left p-4 h-auto"
                                    onClick={() =>
                                        handleInputChange({
                                            target: { value: "How do I claim free gas fees?" },
                                        } as any)
                                    }
                                >
                                    How do I claim free gas fees?
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start text-left p-4 h-auto"
                                    onClick={() =>
                                        handleInputChange({
                                            target: { value: "Explain how the thrift feature works" },
                                        } as any)
                                    }
                                >
                                    Explain thrift features
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start text-left p-4 h-auto"
                                    onClick={() =>
                                        handleInputChange({
                                            target: { value: "What are the fees for using Esusu?" },
                                        } as any)
                                    }
                                >
                                    What are the fees?
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start text-left p-4 h-auto"
                                    onClick={() =>
                                        handleInputChange({
                                            target: { value: "How do I withdraw my savings?" },
                                        } as any)
                                    }
                                >
                                    Withdrawal process
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-6 space-y-8">
                            {messages.map((message: Message, i: number) => (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "px-4 md:px-8 max-w-3xl mx-auto",
                                        message.role === "user" ? "text-gray-900 dark:text-white" : ""
                                    )}
                                >
                                    <div className="flex items-start gap-4 mb-1">
                                        {message.role !== "user" ? (
                                            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                                                <Bot className="w-5 h-5 text-white" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                                <User className="w-5 h-5 text-white" />
                                            </div>
                                        )}
                                        <div className="prose dark:prose-invert max-w-none flex-1 text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3">
                                            <ReactMarkdown>{String(message.content)}</ReactMarkdown>
                                        </div>
                                    </div>
                                    {message.role !== "user" && i === messages.length - 1 && (
                                        <div className="flex ml-12 mt-2 gap-2 text-black dark:text-gray-400">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs"
                                                onClick={() => reload()}
                                            >
                                                <RotateCcw className="h-3 w-3 mr-2 text-black dark:text-gray-400" />
                                                Regenerate
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isLoading && (
                                <div className="px-4 md:px-8 max-w-3xl mx-auto">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                                            <Bot className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 inline-block">
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

                {/* Input Container - Fixed at Bottom */}
                <div className="shrink-0 border-t dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (input.trim()) {
                                handleSubmit(e);
                            }
                        }}
                        className="max-w-3xl mx-auto"
                    >
                        <div className="relative">
                            <Input
                                className="pr-12 py-6 pl-4 text-black dark:text-gray-400 bg-white dark:bg-gray-900 border-2 dark:border-gray-700 rounded-xl"
                                placeholder="Message Esusu Assistant..."
                                value={input}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                size="icon"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary dark:bg-primary hover:bg-primary-700 text-black rounded-lg h-9 w-9"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="text-xs text-center mt-2 text-gray-500">
                            Esusu Assistant can make mistakes. Consider checking important information.
                        </div>
                    </form>
                </div>
            </div>

            {/* Deposit Form Modal - Fixed Overlay */}
            {showDepositForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Complete Your Deposit
                            </h3>
                            <button
                                onClick={() => setShowDepositForm(false)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <EsusuDeposit
                                initialToken={depositData?.tokenAddress}
                                initialAmount={depositData?.amount}
                                onSuccess={() => setShowDepositForm(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback Form Modal - Fixed Overlay */}
            {showFeedbackForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Submit Feedback Onchain
                            </h3>
                            <button
                                onClick={() => setShowFeedbackForm(false)}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <FeedbackForm
                                initialData={feedbackData?.params}
                                onSuccess={() => setShowFeedbackForm(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}