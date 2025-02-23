"use client";
import { useChat, Message } from "ai/react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Send, User, Bot, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { set } from "zod";

interface ChatHistory {
    id: string;
    title: string;
    timestamp: Date;
}


export default function Chat() {
    const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
 
    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading,
    } = useChat({
        api: "/api/chat/route",
        initialMessages: []
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-[30%] border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <div className="p-4">
                    <Button
                        className="w-full mb-4 gap-2"
                        variant="outline"
                        onClick={() => setSelectedChat(null)}
                    >
                        <Plus className="h-4 w-4" />
                        New Chat
                    </Button>

                    <div className="space-y-2">
                        {chatHistory.map((chat) => (
                            <div
                                key={chat.id}
                                className={cn(
                                    "p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800",
                                    selectedChat === chat.id && "bg-gray-100 dark:bg-gray-800"
                                )}
                                onClick={() => setSelectedChat(chat.id)}
                            >
                                <h3 className="font-medium truncate">{chat.title}</h3>
                                <p className="text-sm text-gray-500">
                                    {chat.timestamp.toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message: Message) => (
                        <div
                            key={message.id}
                            className={cn(
                                "flex gap-2 w-full items-start",
                                message.role === "user" ? "justify-end" : "justify-start"
                            )}
                        >
                            {message.role !== "user" && (
                                <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div
                                className={cn(
                                    "rounded-lg px-4 py-2 max-w-[80%] break-words",
                                    message.role === "user"
                                        ? "bg-gray-500 text-white"
                                        : "bg-gray-100 dark:bg-gray-800 dark:text-gray-100"
                                )}
                            >
                                <ReactMarkdown>{String(message.content)}</ReactMarkdown>
                            </div>
                            {message.role === "user" && (
                                <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                                <div className="flex gap-2 items-center">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="p-4 border-t dark:border-gray-800 bg-white dark:bg-gray-900"
                >
                    <div className="flex gap-2 max-w-[70%] mx-auto">
                        <Input
                            className="flex-1"
                            placeholder="Type your message..."
                            value={input}
                            onChange={handleInputChange}
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            size="icon"
                            className="bg-gray-500 hover:bg-gray-600"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}