"use client";
import React, { useEffect, useState } from "react";
import { celo } from "wagmi/chains";
import { createPublicClient, http, decodeFunctionData } from "viem";
import { useAccount } from "wagmi";
import { stableTokenABI } from "@celo/abis";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  CopyIcon,
  ShieldCheck,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Transaction {
  args: { from: string; to: string; value: string; functionName: string };
  transactionHash: string;
  key: string;
  status: boolean;
  timestamp?: string;
  input?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
}

const TOKEN_ADDRESSES: { [key: string]: { symbol: string; decimals: number } } =
  {
    ["0x471EcE3750Da237f93B8E339c536989b8978a438".toLowerCase()]: {
      symbol: "CELO",
      decimals: 18,
    },
    ["0xcebA9300f2b948710d2653dD7B07f33A8B32118C".toLowerCase()]: {
      symbol: "USDC",
      decimals: 6,
    },
    ["0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e".toLowerCase()]: {
      symbol: "USDT",
      decimals: 6,
    },
    ["0x765DE816845861e75A25fCA122bb6898B8B1282a".toLowerCase()]: {
      symbol: "cUSD",
      decimals: 18,
    },
    ["0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A".toLowerCase()]: {
      symbol: "G$",
      decimals: 18,
    },
  };

const truncateAddress = (address: string, short = false): string => {
  if (!address) return "";
  return short
    ? `${address.slice(0, 4)}...${address.slice(-3)}`
    : `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatDate = (timestamp?: string): string => {
  if (!timestamp) return "—";
  const date = new Date(parseInt(timestamp) * 1000);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 3600000);

  if (diff < 1) {
    const m = Math.floor((now.getTime() - date.getTime()) / 60000);
    return m < 1 ? "Now" : `${m}m`;
  }
  if (diff < 24) return `${diff}h`;
  if (diff < 168) return `${Math.floor(diff / 24)}d`;
  return date.toLocaleDateString();
};

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchTx = async () => {
      if (!address) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const now = Math.floor(Date.now() / 1000);
        const past = now - 365 * 24 * 60 * 60;

        const [start, end] = await Promise.all([
          fetch(`/api/celo/proxy?module=block&action=getblocknobytime&timestamp=${past}&closest=after`).then(r => r.json()),
          fetch(`/api/celo/proxy?module=block&action=getblocknobytime&timestamp=${now}&closest=after`).then(r => r.json()),
        ]);

        const data = await fetch(
          `/api/celo/proxy?module=account&action=txlist&address=${address}&startblock=${start.result}&endblock=${end.result}&page=${page}&offset=10&sort=desc`,
          { signal }
        ).then(r => r.json());

        if (Array.isArray(data.result)) {
          const txs = data.result.map((tx: any, i: number) => {
            let fn = "";
            try {
              const d = decodeFunctionData({
                abi: stableTokenABI,
                data: tx.input,
              });
              fn = d?.functionName || "Transfer";
            } catch {
              fn = tx.input === "0x" ? "Transfer" : "Contract";
            }

            return {
              args: {
                from: tx.from,
                to: tx.to,
                value: tx.tokenValue || tx.value,
                functionName: fn,
              },
              transactionHash: tx.hash,
              timestamp: tx.timeStamp,
              key: `${tx.hash}-${i}`,
              status: tx.isError === "0",
              tokenSymbol: tx.tokenName || "CELO",
              tokenAddress: tx.to,
            };
          });

          setTransactions(prev => {
            const seen = new Set(prev.map(t => t.transactionHash));
            return [...prev, ...txs.filter(t => !seen.has(t.transactionHash))];
          });
        }
      } catch {
        //
      } finally {
        setIsLoading(false);
      }
    };

    fetchTx();
    return () => controller.abort();
  }, [address, page]);

  const formatValue = (value: string, symbol = "CELO") => {
    const token = Object.values(TOKEN_ADDRESSES).find(t => t.symbol === symbol);
    const decimals = token?.decimals || 18;
    const num = parseFloat(value) / Math.pow(10, decimals);
    if (!num) return "0";
    return num.toFixed(4).replace(/\.?0+$/, "");
  };

  const filtered = transactions.filter(tx => {
    if (filter === "sent") return tx.args.from.toLowerCase() === address?.toLowerCase();
    if (filter === "received") return tx.args.to.toLowerCase() === address?.toLowerCase();
    return true;
  });

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <Card className="bg-white dark:bg-black border shadow-sm">
      <CardHeader className="flex justify-between items-center">
        <div>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent activity</CardDescription>
          {error && <p className="text-xs text-gray-500">{error}</p>}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {filter}
              <ChevronDownIcon className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilter("all")}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("sent")}>Sent</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("received")}>Received</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="space-y-2">
        {isLoading && transactions.length === 0 ? (
          Array(4)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))
        ) : filtered.length > 0 ? (
          filtered.map(tx => {
            const isSent = tx.args.from.toLowerCase() === address?.toLowerCase();
            const amount = formatValue(tx.args.value, tx.tokenSymbol);

            return (
              <div
                key={tx.key}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full">
                    {isSent ? (
                      <ArrowUpIcon className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 text-gray-600" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-sm font-medium">
                      {isSent ? "Sent" : "Received"}
                      {tx.status ? (
                        <CheckCircleIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {truncateAddress(tx.transactionHash)}
                      <button onClick={() => copy(tx.transactionHash)}>
                        {copied === tx.transactionHash ? "✓" : <CopyIcon className="h-3 w-3" />}
                      </button>
                      <span>{formatDate(tx.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-sm">
                  {isSent ? "-" : "+"}
                  {amount} {tx.tokenSymbol}
                  <div className="flex justify-end mt-1">
                    <a
                      href={`https://explorer.celo.org/mainnet/tx/${tx.transactionHash}`}
                      target="_blank"
                    >
                      <ExternalLinkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-sm text-gray-500 py-6">
            No transactions
          </p>
        )}
      </CardContent>

      {filtered.length > 0 && (
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setPage(p => p + 1)}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoaderCircleIcon className="h-4 w-4 animate-spin" />
            ) : (
              "Load more"
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}