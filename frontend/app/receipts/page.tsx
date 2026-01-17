"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useActiveAccount } from "thirdweb/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ReceiptCard, ReceiptTx } from "@/components/receipts/ReceiptCard";
import { ReceiptText } from "lucide-react";

export default function ReceiptsPage() {
  const account = useActiveAccount();
  const address = account?.address;
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

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Receipts</h1>
          <p className="text-muted-foreground">History of your utility bills and contributions</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="utility_payment">Utilities</SelectItem>
              <SelectItem value="group_contribution">Group Contrib</SelectItem>
              <SelectItem value="group_payout">Payouts</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-dashed shadow-sm bg-muted/20">
        <CardContent className="p-6">
          {!address ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <ReceiptText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Wallet Not Connected</h3>
              <p className="text-muted-foreground text-sm">Please connect your wallet to view your transaction history.</p>
            </div>
          ) : loading && items.length === 0 ? (
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-xl bg-background">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p>{error}</p>
              <Button onClick={() => fetchReceipts(true)} variant="outline" className="mt-4">Try Again</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <ReceiptText className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No Receipts Found</h3>
              <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
                You haven't made any transactions yet. When you do, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {items.map((tx) => (
                <Link
                  key={tx.transactionHash}
                  href={`/tx/${tx.transactionHash}?type=${encodeURIComponent(tx.subType || "payment")}`}
                  className="block transition-transform active:scale-[0.99]"
                >
                  <ReceiptCard transaction={tx} />
                </Link>
              ))}
            </div>
          )}

          {!loading && hasMore && (
            <div className="mt-8 text-center">
              <Button onClick={onLoadMore} variant="outline" className="w-full sm:w-auto min-w-[200px]">
                Load More History
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
