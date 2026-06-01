"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useWeb3AuthConnect } from "@web3auth/modal/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  WalletIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  ArrowRightLeftIcon,
  CreditCardIcon,
  Copy,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Token registry ─────────────────────────────────────────────────────────
const TOKENS = [
  {
    id: "CELO",
    symbol: "CELO",
    name: "Celo",
    address: "0x471EcE3750Da237f93B8E339c536989b8978a438" as `0x${string}`,
    decimals: 18,
    logo: "/celo2.png",
    textColor: "text-yellow-700 dark:text-yellow-300",
    bgLight: "bg-yellow-50 dark:bg-yellow-950/30",
  },
  {
    id: "CUSD",
    symbol: "cUSD",
    name: "Celo Dollar",
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`,
    decimals: 18,
    logo: "/cusd2.png",
    textColor: "text-green-700 dark:text-green-300",
    bgLight: "bg-green-50 dark:bg-green-950/30",
  },
  {
    id: "USDC",
    symbol: "USDC",
    name: "USD Coin",
    address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`,
    decimals: 6,
    logo: "/usdc.png",
    textColor: "text-blue-700 dark:text-blue-300",
    bgLight: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "USDT",
    symbol: "USDT",
    name: "Tether USD",
    address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as `0x${string}`,
    decimals: 6,
    logo: "/usdt.png",
    textColor: "text-teal-700 dark:text-teal-300",
    bgLight: "bg-teal-50 dark:bg-teal-950/30",
  },
  {
    id: "GD",
    symbol: "G$",
    name: "GoodDollar",
    address: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A" as `0x${string}`,
    decimals: 18,
    logo: "/gooddollar.svg",
    textColor: "text-purple-700 dark:text-purple-300",
    bgLight: "bg-purple-50 dark:bg-purple-950/30",
  },
] as const;

type TokenId = (typeof TOKENS)[number]["id"];

const balanceOfAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────
function formatBalance(raw: bigint, decimals: number, dp = 4): string {
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, dp);
  return `${whole.toLocaleString()}.${fracStr}`;
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function WalletPage() {
  const { address, isConnected } = useAccount();
  const { connect, loading: isConnecting } = useWeb3AuthConnect();
  const publicClient = usePublicClient({ chainId: 42220 });
  const router = useRouter();

  const [balances, setBalances] = useState<Record<TokenId, bigint | null>>({
    CELO: null, CUSD: null, USDC: null, USDT: null, GD: null,
  });
  const [celoPrice, setCeloPrice] = useState(2.8);
  const [gdPrice, setGdPrice] = useState(0.0001);
  const [loading, setLoading] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Fetch live prices once
  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=celo,gooddollar&vs_currencies=usd"
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.celo?.usd) setCeloPrice(data.celo.usd);
        if (data?.gooddollar?.usd) setGdPrice(data.gooddollar.usd);
      })
      .catch(() => {/* keep defaults */});
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!address || !isConnected || !publicClient) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        TOKENS.map((token) =>
          (publicClient as any).readContract({
            address: token.address,
            abi: balanceOfAbi,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          })
        )
      );

      const next: Record<string, bigint | null> = {};
      TOKENS.forEach((token, i) => {
        const res = results[i];
        next[token.id] = res.status === "fulfilled" ? (res.value as bigint) : null;
      });
      setBalances(next as Record<TokenId, bigint | null>);
      setLastRefreshed(new Date());
    } catch {
      toast.error("Failed to fetch balances");
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, publicClient]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // USD value for a given token + raw balance
  function usdValue(tokenId: TokenId, raw: bigint, decimals: number): number {
    const amount = parseFloat(formatBalance(raw, decimals, 6));
    if (tokenId === "CELO") return amount * celoPrice;
    if (tokenId === "GD") return amount * gdPrice;
    return amount; // stables = 1:1
  }

  const totalUsd = TOKENS.reduce((sum, token) => {
    const raw = balances[token.id];
    if (raw === null) return sum;
    return sum + usdValue(token.id, raw, token.decimals);
  }, 0);

  const displayAmount = (amount: string) =>
    hideAmounts ? "••••••" : amount;

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="bg-primary/10 rounded-full p-6">
          <WalletIcon className="h-12 w-12 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            My Wallet
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Connect your wallet to view balances
          </p>
        </div>
        <Button onClick={() => connect()} disabled={isConnecting} size="lg">
          {isConnecting ? "Connecting…" : "Connect Wallet"}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 pb-16">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-xl p-2.5">
                <WalletIcon className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                My Wallet
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHideAmounts((v) => !v)}
                className="h-9 w-9 text-gray-500 hover:text-primary"
                title={hideAmounts ? "Show balances" : "Hide balances"}
              >
                {hideAmounts ? (
                  <EyeIcon className="h-4 w-4" />
                ) : (
                  <EyeOffIcon className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchBalances}
                disabled={loading}
                className={cn("h-9 w-9 text-gray-500 hover:text-primary", loading && "animate-spin")}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Address bar */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-neutral-800 rounded-xl px-4 py-3 mb-6">
            <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            <code className="text-sm text-gray-700 dark:text-gray-300 flex-1 font-mono">
              {address ? truncateAddress(address) : "—"}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-gray-400 hover:text-primary"
              onClick={() => {
                if (address) {
                  navigator.clipboard.writeText(address);
                  toast.success("Address copied");
                }
              }}
              title="Copy address"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <a
              href={`https://celoscan.io/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-gray-400 hover:text-primary"
                title="View on Celoscan"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>

          {/* Total balance */}
          <div className="text-center">
            {loading ? (
              <Skeleton className="h-12 w-40 mx-auto mb-1" />
            ) : (
              <motion.p
                key={totalUsd}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold text-gray-900 dark:text-white"
              >
                {hideAmounts
                  ? "$ ••••••"
                  : `$${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </motion.p>
            )}
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {lastRefreshed
                ? `Updated ${lastRefreshed.toLocaleTimeString()}`
                : "Total portfolio value (USD)"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick actions ──────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Deposit",
              icon: ArrowDownLeftIcon,
              onClick: () => router.push("/miniSafe"),
            },
            {
              label: "Send",
              icon: ArrowUpRightIcon,
              onClick: () => router.push("/thrift"),
            },
            {
              label: "Swap",
              icon: ArrowRightLeftIcon,
              href: "https://app.mento.org/swap/celo",
            },
            {
              label: "Buy",
              icon: CreditCardIcon,
              href: "https://global.transak.com/?defaultCryptoCurrency=CELO&network=celo",
            },
          ].map(({ label, icon: Icon, onClick, href }) => {
            const inner = (
              <div className="flex flex-col items-center gap-2 rounded-2xl p-4 transition-colors cursor-pointer bg-white dark:bg-black border border-black dark:border-white hover:bg-primary hover:border-primary group">
                <div className="rounded-full p-2.5 bg-primary group-hover:bg-black dark:group-hover:bg-white shadow-sm">
                  <Icon className="h-5 w-5 text-black group-hover:text-white dark:group-hover:text-black" />
                </div>
                <span className="text-xs font-medium text-black dark:text-white group-hover:text-black">{label}</span>
              </div>
            );

            if (href) {
              return (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer">
                  {inner}
                </a>
              );
            }
            return (
              <div key={label} onClick={onClick}>
                {inner}
              </div>
            );
          })}
        </div>

        {/* ── Token list ──────────────────────────────────────────────── */}
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Assets
        </h2>
        <Card className="border border-gray-100 dark:border-neutral-800 overflow-hidden">
          <CardContent className="p-0 divide-y divide-gray-100 dark:divide-neutral-800">
            <AnimatePresence>
              {TOKENS.map((token, i) => {
                const raw = balances[token.id];
                const formatted =
                  raw !== null ? formatBalance(raw, token.decimals) : null;
                const usd =
                  raw !== null
                    ? usdValue(token.id, raw, token.decimals)
                    : null;

                return (
                  <motion.div
                    key={token.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 px-4 py-4"
                  >
                    {/* Token icon */}
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 flex items-center justify-center">
                      <Image
                        src={token.logo}
                        alt={token.symbol}
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>

                    {/* Token name + symbol */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                        {token.symbol}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {token.name}
                      </p>
                    </div>

                    {/* Balance */}
                    <div className="text-right shrink-0">
                      {loading || formatted === null ? (
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-20 ml-auto" />
                          <Skeleton className="h-3 w-12 ml-auto" />
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">
                            {displayAmount(formatted)}{" "}
                            <span className={cn("text-xs font-normal", token.textColor)}>
                              {token.symbol}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {hideAmounts
                              ? "$ ••••"
                              : `≈ $${usd!.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`}
                          </p>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Celoscan link */}
        <div className="mt-4 text-center">
          <a
            href={`https://celoscan.io/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View full history on Celoscan
          </a>
        </div>
      </div>
    </div>
  );
}
