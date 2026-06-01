"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { format } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Search,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";



const ADMIN_WALLETS = [
  "0x4d4cc2e0c5cbc9737a0dec28d7c2510e2bef5a0",
  "0xb8c198e8f563096c9df0067e7e64a4da8c129d5a",
];

const LIMIT = 50;



interface UtilityTx {
  _id?: string;
  transactionHash: string;
  type: string;
  subType?: string;
  amount: number;
  token: string;
  status: string;
  blockchainStatus?: { confirmed: boolean; confirmations: number };
  utilityDetails?: {
    recipient?: string;
    provider?: string;
    country?: string;
    metadata?: { email?: string; useLocalAmount?: boolean; [k: string]: unknown };
  };
  user?: { walletAddress?: string };
  createdAt?: string;
  updatedAt?: string;
}



function truncate(s: string, head = 8, tail = 6) {
  if (!s) return "-";
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
}

function countryName(code?: string) {
  if (!code) return "-";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  completed: { label: "Success",    icon: CheckCircle2, cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  confirmed: { label: "Confirmed",  icon: CheckCircle2, cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  pending:   { label: "Processing", icon: Clock,        cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  failed:    { label: "Failed",     icon: XCircle,      cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};



function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      className="ml-1 shrink-0 text-gray-400 hover:text-primary transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}


function ShortCell({ value, head, tail }: { value?: string; head?: number; tail?: number }) {
  if (!value) return <span className="text-gray-400">-</span>;
  return (
    <span className="inline-flex items-center font-mono text-xs">
      <span title={value}>{truncate(value, head, tail)}</span>
      <CopyBtn value={value} />
    </span>
  );
}


function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}



export default function UtilityAdminPage() {
  const { address, isConnected } = useAccount();

  const isAdmin = !!address && ADMIN_WALLETS.includes(address.toLowerCase());

  const [items, setItems]     = useState<UtilityTx[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [subType, setSubType] = useState("all");
  const [status, setStatus]   = useState("all");
  const [search, setSearch]   = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [offset, setOffset]   = useState(0);

  const fetchTxs = useCallback(
    async (resetOffset = false) => {
      if (!address || !isAdmin) return;
      setLoading(true);
      setError(null);
      const off = resetOffset ? 0 : offset;

      try {
        const params = new URLSearchParams({
          admin: address,
          limit: String(LIMIT),
          offset: String(off),
        });
        if (subType !== "all") params.set("subType", subType);
        if (status !== "all")  params.set("status", status);
        if (search)             params.set("search", search);

        const res  = await fetch(`/api/admin/utility-transactions?${params}`, { cache: "no-store" });
        const json = await res.json();

        if (!res.ok || !json?.success) throw new Error(json?.error ?? "Failed to load");

        setItems((prev) => resetOffset ? json.transactions : [...prev, ...json.transactions]);
        setTotal(json.total ?? 0);
        if (resetOffset) setOffset(0);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [address, isAdmin, subType, status, search, offset]
  );

  useEffect(() => {
    if (isAdmin) {
      setItems([]);
      setOffset(0);
      fetchTxs(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, subType, status, search]);

  // â”€â”€ Access guard â”€â”€
  if (!isConnected || !address) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <ShieldOff className="h-10 w-10 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Connect your wallet to continue</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4">
        <ShieldOff className="h-10 w-10 text-red-400 opacity-70" />
        <p className="text-sm font-medium text-red-500">Access denied</p>
        <p className="text-xs text-muted-foreground">This page is restricted to admins only.</p>
      </div>
    );
  }

  const hasMore = items.length < total;

  return (
    <div className="px-4 py-8 pb-20 max-w-full overflow-x-auto">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Utility Transactions
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Admin &middot; All users &middot; {loading ? "..." : `${total} records`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setItems([]); setOffset(0); fetchTxs(true); }}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* â”€â”€ Filters â”€â”€ */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Hash, phone, provider..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); } }}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select value={subType} onValueChange={setSubType}>
          <SelectTrigger className="h-9 w-[140px] text-sm">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            <SelectItem value="electricity">Electricity</SelectItem>
            <SelectItem value="airtime">Airtime</SelectItem>
            <SelectItem value="data">Mobile Data</SelectItem>
            <SelectItem value="cable">Cable TV</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[140px] text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Success</SelectItem>
            <SelectItem value="pending">Processing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* â”€â”€ Table â”€â”€ */}
      {loading && items.length === 0 ? (
        <TableSkeleton />
      ) : error ? (
        <div className="text-center py-16 space-y-2">
          <XCircle className="h-7 w-7 text-red-400 mx-auto" />
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchTxs(true)}>Retry</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No transactions found</div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-neutral-900 text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-neutral-800">
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Wallet</th>
                    <th className="px-4 py-3 text-left font-medium">Service</th>
                    <th className="px-4 py-3 text-left font-medium">Provider</th>
                    <th className="px-4 py-3 text-left font-medium">Recipient</th>
                    <th className="px-4 py-3 text-left font-medium">Country</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Tx Hash</th>
                    <th className="px-4 py-3 text-left font-medium">Explorer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {items.map((tx, idx) => {
                    const sCfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.pending;
                    const StatusIcon = sCfg.icon;
                    const wallet = (tx.user as any)?.walletAddress as string | undefined;
                    const email  = tx.utilityDetails?.metadata?.email;

                    return (
                      <tr
                        key={tx.transactionHash}
                        className="bg-white dark:bg-neutral-950 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
                      >
                        {/* # */}
                        <td className="px-4 py-3 text-gray-400 tabular-nums">{offset + idx + 1}</td>

                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                          {tx.createdAt ? format(new Date(tx.createdAt), "dd MMM yy, HH:mm") : "-"}
                        </td>

                        {/* Wallet */}
                        <td className="px-4 py-3">
                          <ShortCell value={wallet} head={6} tail={4} />
                        </td>

                        {/* Service */}
                        <td className="px-4 py-3 capitalize text-gray-700 dark:text-gray-300">
                          {tx.subType ?? tx.type ?? "-"}
                        </td>

                        {/* Provider */}
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                          {tx.utilityDetails?.provider ?? "-"}
                        </td>

                        {/* Recipient / phone */}
                        <td className="px-4 py-3">
                          {tx.utilityDetails?.recipient ? (
                            <span className="inline-flex items-center font-mono text-xs text-gray-800 dark:text-gray-200">
                              {tx.utilityDetails.recipient}
                              <CopyBtn value={tx.utilityDetails.recipient} />
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                          {email && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{email}</p>
                          )}
                        </td>

                        {/* Country */}
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {countryName(tx.utilityDetails?.country)}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900 dark:text-white whitespace-nowrap">
                          {tx.amount.toFixed(4)}{" "}
                          <span className="text-xs font-normal text-gray-400">{tx.token}</span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge className={cn("text-[10px] px-2 py-0.5 gap-1 inline-flex items-center", sCfg.cls)}>
                            <StatusIcon className="h-3 w-3" />
                            {sCfg.label}
                          </Badge>
                        </td>

                        {/* Tx Hash */}
                        <td className="px-4 py-3">
                          <ShortCell value={tx.transactionHash} head={8} tail={6} />
                        </td>

                        {/* Explorer link */}
                        <td className="px-4 py-3">
                          <a
                            href={`https://celoscan.io/tx/${tx.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => {
                  const next = offset + LIMIT;
                  setOffset(next);
                  fetchTxs(false);
                }}
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                Load more ({items.length} / {total})
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
