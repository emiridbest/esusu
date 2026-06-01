"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { format } from "date-fns";
import {
  Zap,
  Smartphone,
  Wifi,
  Tv,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Phone,
  Building2,
  Globe,
  Mail,
  Hash,
  ShieldCheck,
  ShieldX,
  ReceiptText,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { mapProviderToParent } from "@/services/utility/countryData";

// ── Types ──────────────────────────────────────────────────────────────────

interface BlockchainStatus {
  confirmed: boolean;
  confirmations: number;
}

interface UtilityMetadata {
  email?: string;
  useLocalAmount?: boolean;
  pinCode?: string;
  [key: string]: unknown;
}

interface UtilityDetails {
  recipient?: string;
  provider?: string;
  country?: string;
  metadata?: UtilityMetadata;
}

interface UtilityTx {
  _id?: string;
  transactionHash: string;
  type: string;
  subType?: "airtime" | "data" | "electricity" | "cable";
  amount: number;
  token: string;
  status: "pending" | "confirmed" | "failed" | "completed";
  blockchainStatus?: BlockchainStatus;
  utilityDetails?: UtilityDetails;
  createdAt?: string;
  updatedAt?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const SUB_TYPE_CONFIG = {
  electricity: {
    label: "Electricity",
    icon: Zap,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
  },
  airtime: {
    label: "Airtime",
    icon: Phone,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  data: {
    label: "Mobile Data",
    icon: Wifi,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/40",
  },
  cable: {
    label: "Cable TV",
    icon: Tv,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/40",
  },
} as const;

const STATUS_CONFIG = {
  completed: {
    label: "Success",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  pending: {
    label: "Processing",
    icon: Clock,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
}

function resolveProviderName(providerId?: string, country?: string): string {
  if (!providerId) return "—";
  if (!country) return `Provider #${providerId}`;
  try {
    const { parentName } = mapProviderToParent(providerId, country);
    return parentName || `Provider #${providerId}`;
  } catch {
    return `Provider #${providerId}`;
  }
}

function truncateHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function countryCodeToName(code?: string): string {
  if (!code) return "—";
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ??
      code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}

// ── Transaction Row ────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: UtilityTx }) {
  const [expanded, setExpanded] = useState(false);

  const subCfg =
    SUB_TYPE_CONFIG[tx.subType ?? "electricity"] ?? SUB_TYPE_CONFIG.electricity;
  const Icon = subCfg.icon;
  const statusCfg = getStatusConfig(tx.status);
  const StatusIcon = statusCfg.icon;

  const provider = resolveProviderName(
    tx.utilityDetails?.provider,
    tx.utilityDetails?.country
  );
  const country = countryCodeToName(tx.utilityDetails?.country);
  const recipient = tx.utilityDetails?.recipient ?? "—";
  const email = tx.utilityDetails?.metadata?.email;
  const blockchainConfirmed = tx.blockchainStatus?.confirmed;
  const confirmations = tx.blockchainStatus?.confirmations ?? 0;

  const dateStr = tx.createdAt
    ? format(new Date(tx.createdAt), "MMM d, yyyy · h:mm a")
    : "—";
  const updatedStr = tx.updatedAt
    ? format(new Date(tx.updatedAt), "MMM d, yyyy · h:mm a")
    : null;

  return (
    <div
      className={cn(
        "border border-gray-100 dark:border-neutral-800 rounded-xl overflow-hidden transition-all",
        expanded ? "shadow-md" : "hover:shadow-sm"
      )}
    >
      {/* ── Summary row ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left bg-white dark:bg-neutral-900 px-4 py-4 flex items-center gap-4"
      >
        {/* Icon */}
        <div
          className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
            subCfg.bg
          )}
        >
          <Icon className={cn("h-5 w-5", subCfg.color)} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {subCfg.label}
            </span>
            <Badge
              className={cn(
                "text-[10px] px-2 py-0.5 flex items-center gap-1",
                statusCfg.className
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {statusCfg.label}
            </Badge>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
            {dateStr} · {truncateHash(tx.transactionHash)}
          </p>
        </div>

        {/* Amount + chevron */}
        <div className="text-right shrink-0 flex items-center gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
              {tx.amount.toFixed(4)}{" "}
              <span className="text-xs font-normal text-gray-400">{tx.token}</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
              {provider}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          )}
        </div>
      </button>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="bg-gray-50 dark:bg-neutral-950 border-t border-gray-100 dark:border-neutral-800 px-4 py-4 space-y-4">
          {/* Grid of details */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DetailItem icon={Phone} label="Recipient / Number" value={recipient} />
            <DetailItem icon={Building2} label="Provider" value={provider} />
            <DetailItem icon={Globe} label="Country" value={country} />
            <DetailItem
              icon={Hash}
              label="Amount"
              value={`${tx.amount.toFixed(6)} ${tx.token}`}
            />
            <DetailItem
              icon={tx.status === "failed" ? ShieldX : ShieldCheck}
              label="Blockchain"
              value={
                blockchainConfirmed
                  ? `Confirmed (${confirmations} conf.)`
                  : confirmations > 0
                  ? `${confirmations} confirmation${confirmations > 1 ? "s" : ""}`
                  : "Unconfirmed"
              }
              valueClass={
                blockchainConfirmed
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
              }
            />
            {email && <DetailItem icon={Mail} label="Email" value={email} />}
          </div>

          {/* TX hash row */}
          <div className="rounded-lg bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 px-3 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">
                Transaction Hash
              </p>
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
                {tx.transactionHash}
              </p>
            </div>
            <a
              href={`https://celoscan.io/tx/${tx.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Explorer
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Timestamps */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-400 dark:text-gray-500">
            <span>Created: {dateStr}</span>
            {updatedStr && <span>Updated: {updatedStr}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 shrink-0 h-6 w-6 rounded-md bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-400 leading-tight">
          {label}
        </p>
        <p
          className={cn(
            "text-xs font-medium text-gray-900 dark:text-white break-all leading-snug mt-0.5",
            valueClass
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Empty / Loading / Error states ────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 border border-gray-100 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900"
        >
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function UtilityTransactionsPage() {
  const { address, isConnected } = useAccount();

  const [items, setItems] = useState<UtilityTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subType, setSubType] = useState("all");
  const [status, setStatus] = useState("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 20;

  const fetchTxs = useCallback(
    async (reset = false) => {
      if (!address) return;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          wallet: address,
          type: "utility_payment",
          limit: String(LIMIT),
          offset: String(reset ? 0 : offset),
        });
        if (status !== "all") params.set("status", status);

        const res = await fetch(`/api/transactions?${params}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok || !json?.success) {
          throw new Error(json?.error ?? "Failed to load transactions");
        }

        let data: UtilityTx[] = json.transactions ?? [];

        // Client-side subType filter (API may not support it directly)
        if (subType !== "all") {
          data = data.filter((tx) => tx.subType === subType);
        }

        setItems((prev) => (reset ? data : [...prev, ...data]));
        setHasMore(json.transactions?.length === LIMIT);
        if (reset) setOffset(0);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [address, subType, status, offset]
  );

  useEffect(() => {
    if (isConnected && address) {
      setItems([]);
      setOffset(0);
      fetchTxs(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected, subType, status]);

  const counts = {
    all: items.length,
    completed: items.filter((t) => t.status === "completed" || t.status === "confirmed").length,
    failed: items.filter((t) => t.status === "failed").length,
    pending: items.filter((t) => t.status === "pending").length,
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <ReceiptText className="h-12 w-12 text-muted-foreground opacity-40" />
        <p className="text-center text-sm text-muted-foreground">
          Connect your wallet to view utility transactions
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Utility Transactions
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            All your airtime, data, electricity &amp; cable payments
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-gray-400 hover:text-primary"
          onClick={() => fetchTxs(true)}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* ── Summary chips ── */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {(
          [
            { key: "all", label: "All", color: "bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300" },
            { key: "completed", label: "Success", color: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400" },
            { key: "pending", label: "Pending", color: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400" },
            { key: "failed", label: "Failed", color: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400" },
          ] as const
        ).map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setStatus(key === "all" ? "all" : key)}
            className={cn(
              "rounded-xl py-2 px-1 text-center transition-all border",
              status === key || (key === "all" && status === "all")
                ? `${color} border-current font-semibold shadow-sm`
                : "bg-white dark:bg-neutral-900 border-gray-100 dark:border-neutral-800 text-gray-500"
            )}
          >
            <p className="text-lg font-bold tabular-nums leading-none">
              {loading ? "—" : counts[key]}
            </p>
            <p className="text-[10px] mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-2 mb-5">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        <Select value={subType} onValueChange={setSubType}>
          <SelectTrigger className="h-9 w-[150px] text-sm">
            <SelectValue placeholder="Service type" />
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

      {/* ── List ── */}
      {loading && items.length === 0 ? (
        <LoadingSkeleton />
      ) : error ? (
        <Card className="border-red-100 dark:border-red-900/40">
          <CardContent className="py-10 text-center space-y-3">
            <XCircle className="h-8 w-8 text-red-400 mx-auto" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchTxs(true)}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <div className="text-center py-20 space-y-2 text-muted-foreground">
          <ReceiptText className="h-8 w-8 mx-auto opacity-30" />
          <p className="text-sm">No utility transactions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((tx) => (
            <TxRow key={tx.transactionHash} tx={tx} />
          ))}

          {hasMore && (
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => {
                const next = offset + LIMIT;
                setOffset(next);
                fetchTxs(false);
              }}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Load more
            </Button>
          )}
        </div>
      )}

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link
          href="/utilityBills"
          className="text-xs text-gray-400 hover:text-primary transition-colors"
        >
          ← Back to Utility Bills
        </Link>
      </div>
    </div>
  );
}
