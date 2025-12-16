"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMiniAppDimensions } from '@/hooks/useMiniAppDimensions';
import { Zap, Users, Banknote, ReceiptText } from "lucide-react";

interface ReceiptTx {
  transactionHash: string;
  type: "savings" | "withdrawal" | "utility_payment" | "group_contribution" | "group_payout";
  subType?: "airtime" | "data" | "electricity" | "cable" | "aave_deposit" | "aave_withdrawal";
  amount: number;
  token: string;
  status: "pending" | "confirmed" | "failed" | "completed";
  createdAt?: string;
}

const typeIcon = (type: ReceiptTx["type"], subType?: ReceiptTx["subType"]) => {
  if (type === "utility_payment") return <Zap className="h-4 w-4 text-primary" />;
  if (type === "group_contribution" || type === "group_payout") return <Users className="h-4 w-4 text-primary" />;
  if (type === "savings" || subType?.startsWith("aave")) return <Banknote className="h-4 w-4 text-primary" />;
  return <ReceiptText className="h-4 w-4 text-primary" />;
};

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

export default function ReceiptsPage() {
  const { address } = useAccount();
  const [items, setItems] = useState<ReceiptTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  const fetchReceipts = async (reset = false) => {
    if (!address) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("wallet", address);
      params.set("limit", String(limit));
      params.set("offset", String(reset ? 0 : offset));
      if (type !== "all") params.set("type", type);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/transactions?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to load receipts");
      }
      const newItems: ReceiptTx[] = json.transactions || [];
      setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
      setHasMore(newItems.length === limit);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "Network error");
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setOffset(0);
    if (address) fetchReceipts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, type, status]);

  const onLoadMore = () => {
    const next = offset + limit;
    setOffset(next);
    fetchReceipts(false);
  };

  const dimensions = useMiniAppDimensions();

  return (
    <div
      className={`${dimensions.containerClass} mx-auto px-4 py-6 overflow-auto`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        maxWidth: dimensions.maxWidth,
      }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Receipts</CardTitle>
              <CardDescription>Your past transactions and bill payments</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="utility_payment">Utilities</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="group_contribution">Group contrib</SelectItem>
                  <SelectItem value="group_payout">Group payout</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!address ? (
            <div className="p-6 text-sm text-muted-foreground">Connect your wallet to view receipts.</div>
          ) : loading && items.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No receipts found.</div>
          ) : (
            <ul className="divide-y divide-border rounded-md border">
              {items.map((tx) => (
                <li key={tx.transactionHash} className="px-3 py-3 hover:bg-muted/30 transition-colors">
                  <Link href={`/tx/${tx.transactionHash}?type=${encodeURIComponent(tx.subType || "payment")}`} className="flex items-center gap-3">
                    <div className="shrink-0 flex items-center justify-center h-9 w-9 rounded-full bg-primary/10">
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
          <div className="flex justify-between items-center pt-4">
            <div className="text-xs text-muted-foreground">
              Showing {items.length} receipt{items.length === 1 ? "" : "s"}
            </div>
            {hasMore && (
              <Button onClick={onLoadMore} variant="outline" disabled={loading}>
                {loading ? "Loading..." : "Load more"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
