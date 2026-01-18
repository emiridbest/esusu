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
    Tv
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ReceiptTx {
    transactionHash: string;
    type: "savings" | "withdrawal" | "utility_payment" | "group_contribution" | "group_payout";
    subType?: "airtime" | "data" | "electricity" | "cable" | "aave_deposit" | "aave_withdrawal";
    amount: number;
    token: string;
    status: "pending" | "confirmed" | "failed" | "completed";
    createdAt?: string;
}

interface ReceiptCardProps {
    transaction: ReceiptTx;
}

export function ReceiptCard({ transaction }: ReceiptCardProps) {
    const { type, subType, amount, token, status, createdAt } = transaction;

    // --- Helpers for Icons & Labels ---
    const getIcon = () => {
        if (type === "utility_payment") {
            if (subType === "electricity") return <Zap className="h-5 w-5 text-yellow-500" />;
            if (subType === "airtime") return <Smartphone className="h-5 w-5 text-blue-500" />;
            if (subType === "data") return <Wifi className="h-5 w-5 text-green-500" />;
            if (subType === "cable") return <Tv className="h-5 w-5 text-purple-500" />;
            return <Zap className="h-5 w-5 text-yellow-500" />;
        }
        if (type === "group_contribution") return <ArrowUpRight className="h-5 w-5 text-indigo-500" />;
        if (type === "group_payout") return <ArrowDownLeft className="h-5 w-5 text-emerald-500" />;
        if (type === "savings") return <Banknote className="h-5 w-5 text-primary" />;
        return <ReceiptText className="h-5 w-5 text-gray-500" />;
    };

    const getTitle = () => {
        if (type === "utility_payment") {
            const service = subType ? subType.charAt(0).toUpperCase() + subType.slice(1) : "Utility";
            return `${service} Bill`;
        }
        if (type === "group_contribution") return "Group Contribution";
        if (type === "group_payout") return "Payout Received";
        if (type === "savings") return "Savings Deposit";
        if (type === "withdrawal") return "Withdrawal";
        return "Transaction";
    };

    const statusConfig = {
        completed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", label: "Paid" },
        confirmed: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", label: "Confirmed" },
        pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", label: "Processing" },
        failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", label: "Failed" },
    };

    const currentStatus = statusConfig[status] || statusConfig.pending;
    const StatusIcon = currentStatus.icon;

    const dateStr = createdAt ? (() => {
        try {
            return format(new Date(createdAt), "MMM d, yyyy • h:mm a");
        } catch {
            return "Unknown Date";
        }
    })() : "Recent";

    return (
        <div className="group relative">
            {/* "Ticket" Cutout Effect (Visual only) */}
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
                                {amount} <span className="text-xs font-sans text-muted-foreground font-normal">{token}</span>
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 truncate">
                                <span>{dateStr}</span>
                                <span className="opacity-30">•</span>
                                <span className="truncate max-w-[100px] font-mono text-xs opacity-70" title={transaction.transactionHash}>
                                    #{transaction.transactionHash.slice(0, 8)}
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
