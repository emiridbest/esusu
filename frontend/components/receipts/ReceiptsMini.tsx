"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Zap, Banknote, Users, ReceiptText } from "lucide-react";

interface ReceiptTx {
  transactionHash: string;
  type: "savings" | "withdrawal" | "utility_payment" | "group_contribution" | "group_payout";
  subType?: "airtime" | "data" | "electricity" | "aave_deposit" | "aave_withdrawal";
  amount: number;
  token: string;
  status: "pending" | "confirmed" | "failed" | "completed";
  createdAt?: string;
}

const statusColor = (status: ReceiptTx["status"]) => {
  switch (status) {
    case "completed":
      return "text-green-600";
    case "failed":
      return "text-red-600";
    case "confirmed":
      return "text-amber-600";
    default:
      return "text-gray-600";
  }
};

const typeIcon = (type: ReceiptTx["type"], subType?: ReceiptTx["subType"]) => {
  if (type === "utility_payment") return <Zap className="h-4 w-4 text-primary" />;
  if (type === "group_contribution" || type === "group_payout") return <Users className="h-4 w-4 text-primary" />;
  if (type === "savings" || subType?.startsWith("aave")) return <Banknote className="h-4 w-4 text-primary" />;
  return <ReceiptText className="h-4 w-4 text-primary" />;
};

export default function ReceiptsMini() {
  const { address } = useAccount();
  const [items, setItems] = useState<ReceiptTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formattedItems = useMemo(() => items.slice(0, 8), [items]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const fetchData = async () => {
      if (!address) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`/api/transactions?wallet=${address}&limit=8`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = await res.json();
        if (!active) return;
        if (!res.ok || !json?.success) {
          setError(json?.error || "Failed to load receipts");
          setLoading(false);
          return;
        }
        setItems(json.transactions || []);
        setLoading(false);
      } catch (e: any) {
        if (!active) return;
        if (e?.name !== "AbortError") {
          setError(e?.message || "Network error");
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      active = false;
      controller.abort();
    };
  }, [address]);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-4 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent receipts</CardTitle>
          <Link href="/receipts" className="text-xs text-primary hover:underline">View all</Link>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {!address ? (
          <div className="p-4 text-sm text-gray-600">Connect your wallet to view receipts.</div>
        ) : loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : formattedItems.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No recent receipts found.</div>
        ) : (
          <ul className="max-h-[360px] overflow-auto">
            {formattedItems.map((tx) => (
              <li key={tx.transactionHash} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-md transition-colors">
                <Link href={`/tx/${tx.transactionHash}?type=${encodeURIComponent(tx.subType || "payment")}`} className="flex items-center gap-3">
                  <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
                    {typeIcon(tx.type, tx.subType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.subType ? tx.subType.replace("_", " ") : tx.type}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {new Date(tx.createdAt || Date.now()).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {tx.amount} {tx.token}
                    </div>
                    <div className={cn("text-xs font-medium", statusColor(tx.status))}>
                      {tx.status}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="p-2 pt-3 flex justify-end">
          <Link href="/receipts">
            <Button variant="outline" size="sm">All receipts</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
