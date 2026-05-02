"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReceiptCard, ReceiptTx } from "@/components/receipts/ReceiptCard";
import { ReceiptText } from "lucide-react";

export default function ReceiptsPage() {
  const { address } = useAccount();

  const [items, setItems] = useState<ReceiptTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

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

      const params = new URLSearchParams({
        wallet: address,
        limit: String(limit),
        offset: String(reset ? 0 : offset),
      });

      if (type !== "all") params.set("type", type);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/transactions?${params}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to load receipts");
      }

      const newItems: ReceiptTx[] = json.transactions || [];

      setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
      setHasMore(newItems.length === limit);
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
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
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-6 space-y-2 dark:text-white">
        <h1 className="text-2xl font-semibold">Receipts</h1>
        <p className="text-sm text-muted-foreground">
          Your transaction history
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 dark:text-white">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="utility_payment">Utilities</SelectItem>
            <SelectItem value="group_contribution">Contributions</SelectItem>
            <SelectItem value="group_payout">Payouts</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="completed">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {!address ? (
        <EmptyState text="Connect your wallet to view receipts" />
      ) : loading && items.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} retry={() => fetchReceipts(true)} />
      ) : items.length === 0 ? (
        <EmptyState text="No transactions yet" />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((tx) => (
              <Link
                key={tx.transactionHash}
                href={`/tx/${tx.transactionHash}?type=${encodeURIComponent(
                  tx.subType || "payment"
                )}`}
              >
                <ReceiptCard transaction={tx} />
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="mt-8">
              <Button
                onClick={onLoadMore}
                variant="outline"
                className="w-full"
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* --- Subcomponents (clean + reusable) --- */

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <ReceiptText className="mx-auto h-6 w-6 mb-3 opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-red-500">{error}</p>
      <Button onClick={retry} variant="outline" className="mt-4">
        Try again
      </Button>
    </div>
  );
}