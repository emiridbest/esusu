import React from "react";
import { format } from "date-fns";
import {
    Zap,
    Users,
    Banknote,
    ReceiptText,
    CheckCircle2,
    XCircle,
    Clock,
    ArrowUpRight,
    ArrowDownLeft,
    Smartphone,
    Wifi,
    Tv,
    ArrowUpIcon,
    ArrowDownIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Adapted interface for Farcaster's CeloScan data
export interface FarcasterTx {
    transactionHash: string;
    timestamp?: string;
    status: boolean; // true = success
    functionName: string;
    value: string; // raw string value
    tokenSymbol?: string;
    isSent: boolean;
    hasValue: boolean;
    formattedAmount: string; // pre-formatted
}

interface ReceiptCardProps {
    transaction: FarcasterTx;
}

export function ReceiptCard({ transaction }: ReceiptCardProps) {
    const { transactionHash, timestamp, status, functionName, isSent, hasValue, formattedAmount, tokenSymbol } = transaction;

    // --- Helpers for Icons & Labels ---
    const getIcon = () => {
        if (hasValue) {
            if (isSent) return <ArrowUpIcon className="h-5 w-5 text-gray-500" />;
            return <ArrowDownIcon className="h-5 w-5 text-green-500" />;
        }
        // Try to guess type from function name
        const fn = functionName.toLowerCase();
        if (fn.includes("approve")) return <CheckCircle2 className="h-5 w-5 text-blue-500" />;
        if (fn.includes("swap")) return <ArrowUpRight className="h-5 w-5 text-purple-500" />;
        if (fn.includes("stake") || fn.includes("deposit")) return <Banknote className="h-5 w-5 text-primary" />;

        return <ReceiptText className="h-5 w-5 text-gray-500" />;
    };

    const getTitle = () => {
        if (hasValue) {
            return isSent ? "Sent Payment" : "Received Payment";
        }
        return functionName || "Transaction";
    };

    const currentStatus = status
        ? { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", label: "Success" }
        : { icon: XCircle, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", label: "Failed" };

    const dateStr = timestamp ? (() => {
        try {
            return format(new Date(parseInt(timestamp) * 1000), "MMM d, yyyy • h:mm a");
        } catch {
            return "Unknown Date";
        }
    })() : "Recent";

    return (
        <div className="group relative">
            {/* "Ticket" Cutout Effect */}
            <div className="absolute -left-1.5 top-1/2 -mt-1.5 h-3 w-3 rounded-full bg-background border-r border-border" />
            <div className="absolute -right-1.5 top-1/2 -mt-1.5 h-3 w-3 rounded-full bg-background border-l border-border" />

            <Card className="border-l-4 border-l-primary/50 hover:border-l-primary transition-all duration-300 shadow-sm hover:shadow-md bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-5 flex items-center gap-4 sm:gap-6">

                    {/* Icon Box */}
                    <div className="shrink-0 relative">
                        <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center shadow-inner",
                            "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
                        )}>
                            {getIcon()}
                        </div>
                        {/* Small status indicator dot */}
                        <div className={cn("absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background", currentStatus.color.replace("text-", "bg-"))} />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0 grid gap-1">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-base truncate pr-2">{getTitle()}</h3>
                            <span className="font-mono font-bold text-lg tabular-nums tracking-tight">
                                {hasValue ? (
                                    <>
                                        <span className={isSent ? "" : "text-green-600 dark:text-green-400"}>
                                            {isSent ? "-" : "+"}{formattedAmount}
                                        </span>
                                        <span className="text-xs font-sans text-muted-foreground font-normal ml-1">{tokenSymbol}</span>
                                    </>
                                ) : (
                                    <span className="text-sm font-normal text-muted-foreground">Interaction</span>
                                )}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 truncate">
                                <span>{dateStr}</span>
                                <span className="opacity-30">•</span>
                                <span className="truncate max-w-[100px] font-mono text-xs opacity-70" title={transactionHash}>
                                    #{transactionHash.slice(0, 8)}
                                </span>
                            </div>

                            <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] uppercase tracking-wider font-semibold border-0", currentStatus.bg, currentStatus.color)}>
                                {currentStatus.label}
                            </Badge>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
