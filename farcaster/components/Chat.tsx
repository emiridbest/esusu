"use client";
import { useChat, Message } from "ai/react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send, User, Bot, Plus, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetStateAction, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface ChatHistory {
    id: string;
    title: string;
    timestamp: Date;
}

export default function Chat() {
    const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
 
    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
        reload,
        stop,
        setMessages,
    } = useChat(
        {
            api: "/api/chat",
            onResponse: (response: { text: any; }) => {
                const newMessage = response.text;
                if (newMessage) {
                    setMessages((prevMessages: any) => [
                        ...prevMessages,
                        { id: String(Date.now()), content: newMessage, role: "assistant" },
                    ]);
                }
            },
            onError: (error: { message: SetStateAction<string | null>; }) => {
                setError(error.message);
            },
        }
    );

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
        <div className="flex h-full">
            {/* Sidebar */}
            <div className="hidden md:block w-[260px] h-full border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
                <div className="p-4">
                    <Button
                        className="w-full mb-4 gap-2 bg-black hover:bg-primary-700 text-white"
                        onClick={handleNewChat}
                    >
                        <Plus className="h-4 w-4" />
                        New Chat
                    </Button>

                    <div className="space-y-2 mt-6">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Chat History</h3>
                        {chatHistory.length > 0 ? (
                            chatHistory.map((chat) => (
                                <div
                                    key={chat.id}
                                    className={cn(
                                        "p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-sm",
                                        selectedChat === chat.id && "bg-gray-100 dark:bg-gray-800"
                                    )}
                                    onClick={() => setSelectedChat(chat.id)}
                                >
                                    <h3 className="font-medium truncate">{chat.title}</h3>
                                    <p className="text-xs text-gray-500">
                                        {chat.timestamp.toLocaleDateString()}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="text-sm text-gray-500 px-2">
                                No chat history yet
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full">
                {/* Messages Container with Fixed Height */}
                <div className="flex-1 overflow-y-auto">
                    {error && (
                        <div className="p-4 m-4 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            {error}
                            <Button 
                                onClick={() => setError(null)} 
                                variant="outline" 
                                size="sm" 
                                className="ml-2">
                                Dismiss
                            </Button>
                        </div>
                    )}
                    
                    {messages.length === 0 && !error ? (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-primary dark:bg-primary flex items-center justify-center mb-6">
                                <Sparkles className="h-8 w-8 text-black dark:text-primary-400" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-black dark:text-white/90">How can I help you today?</h2>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                                Ask me about Esusu services, managing your finances, or how to use the platform.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg dark:text-gray-400">
                                <Button variant="outline" className="justify-start text-left p-4 h-auto" onClick={() => 
                                    handleInputChange({ target: { value: "How do I deposit funds into my Esusu account?" } } as any)}>
                                    How do I deposit funds?
                                </Button>
                                <Button variant="outline" className="justify-start text-left p-4 h-auto" onClick={() => 
                                    handleInputChange({ target: { value: "Explain how the thrift feature works" } } as any)}>
                                    Explain thrift features
                                </Button>
                                <Button variant="outline" className="justify-start text-left p-4 h-auto" onClick={() => 
                                    handleInputChange({ target: { value: "What are the fees for using Esusu?" } } as any)}>
                                    What are the fees?
                                </Button>
                                <Button variant="outline" className="justify-start text-left p-4 h-auto" onClick={() => 
                                    handleInputChange({ target: { value: "How do I withdraw my savings?" } } as any)}>
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
                                        <div className="prose dark:prose-invert max-w-none flex-1 text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
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
                            <div ref={messagesEndRef} className="pb-20" />
                        </div>
                    )}
                </div>

                {/* Input Container - Static Bottom Position */}
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
        </div>
    );
}