import React from "react";
import { format } from "date-fns";
import {
    Zap,
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
    Gift
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ReceiptTx {
    transactionHash: string;
    type: "savings" | "withdrawal" | "utility_payment" | "group_contribution" | "group_payout" | "cashback";
    subType?: "airtime" | "data" | "electricity" | "cable";
    amount: number;
    token: string;
    status: "pending" | "confirmed" | "failed" | "completed";
    createdAt?: string;
}

export function ReceiptCard({ transaction }: { transaction: ReceiptTx }) {
    const { type, subType, amount, token, status, createdAt } = transaction;

    const getIcon = () => {
        if (type === "cashback") return <Gift className="h-5 w-5" />;
        if (type === "utility_payment") {
            if (subType === "electricity") return <Zap className="h-5 w-5" />;
            if (subType === "airtime") return <Smartphone className="h-5 w-5" />;
            if (subType === "data") return <Wifi className="h-5 w-5" />;
            if (subType === "cable") return <Tv className="h-5 w-5" />;
            return <Zap className="h-5 w-5" />;
        }
        if (type === "group_contribution") return <ArrowUpRight className="h-5 w-5" />;
        if (type === "group_payout") return <ArrowDownLeft className="h-5 w-5" />;
        if (type === "savings") return <Banknote className="h-5 w-5" />;
        return <ReceiptText className="h-5 w-5" />;
    };

    const getTitle = () => {
        if (type === "cashback") return "Cashback Reward";
        if (type === "utility_payment") {
            const service = subType ? subType.charAt(0).toUpperCase() + subType.slice(1) : "Utility";
            return `${service}`;
        }
        if (type === "group_contribution") return "Contribution";
        if (type === "group_payout") return "Payout";
        if (type === "savings") return "Savings";
        if (type === "withdrawal") return "Withdrawal";
        return "Transaction";
    };

    const statusConfig = {
        completed: { label: "Paid", className: "bg-green-100 text-green-700" },
        confirmed: { label: "Confirmed", className: "bg-green-100 text-green-700" },
        pending: { label: "Processing", className: "bg-amber-100 text-amber-700" },
        failed: { label: "Failed", className: "bg-red-100 text-red-700" },
    };

    const currentStatus = statusConfig[status] || statusConfig.pending;

    const dateStr = createdAt
        ? format(new Date(createdAt), "MMM d • h:mm a")
        : "Recent";

    return (
        <Card className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">

                {/* Icon */}
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {getIcon()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{getTitle()}</p>
                        <p className="text-sm font-semibold tabular-nums">
                            {Number(amount.toFixed(5))} <span className="text-xs text-muted-foreground">{token}</span>
                        </p>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                        <span className="truncate">
                            {dateStr} • #{transaction.transactionHash.slice(0, 6)}
                        </span>

                        <Badge className={cn("text-[10px] px-2 py-0.5", currentStatus.className)}>
                            {currentStatus.label}
                        </Badge>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}