"use client";
import React, { useEffect, useState } from 'react';
import { celo } from 'wagmi/chains';
import { createPublicClient, http, webSocket, fallback, decodeFunctionData } from 'viem';
import { useAccount } from 'wagmi';
import { stableTokenABI } from "@celo/abis";
// import { useAddRecentTransaction } from '@rainbow-me/rainbowkit';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  CopyIcon,
  CheckIcon,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Transaction {
  args: {
    from: string;
    to: string;
    value: string;
    functionName: string;
  };
  transactionHash: string;
  key: string;
  status: boolean;
  timestamp?: string;
  input?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
}

// Token addresses on Celo
const TOKEN_ADDRESSES: { [key: string]: { symbol: string; decimals: number } } = {
  ['0x471EcE3750Da237f93B8E339c536989b8978a438'.toLowerCase()]: { symbol: 'CELO', decimals: 18 },
  ['0xcebA9300f2b948710d2653dD7B07f33A8B32118C'.toLowerCase()]: { symbol: 'USDC', decimals: 6 },
  ['0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e'.toLowerCase()]: { symbol: 'USDT', decimals: 6 },
  ['0x765DE816845861e75A25fCA122bb6898B8B1282a'.toLowerCase()]: { symbol: 'cUSD', decimals: 18 },
  ['0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'.toLowerCase()]: { symbol: 'G$', decimals: 18 },
};

const truncateAddress = (address: string): string => {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
};

const formatDate = (timestamp: string | undefined): string => {
  if (!timestamp) return 'Unknown date';
  const date = new Date(parseInt(timestamp) * 1000);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    const diffInMins = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    return diffInMins < 1 ? 'Just now' : `${diffInMins}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInHours < 168) {
    const days = Math.floor(diffInHours / 24);
    return `${days}d ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const TransactionList: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState(1);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'sent' | 'received'>('all');
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string>('');

  const chains = [42220];

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const CELOSCAN_API_KEY = process.env.NEXT_PUBLIC_CELOSCAN_API_KEY || '';
    const CELOSCAN_API_BASE = process.env.NEXT_PUBLIC_CELOSCAN_API_BASE || 'https://api.celoscan.io/api';
    const withApiKey = (qs: string) => `${qs}${CELOSCAN_API_KEY ? `&apikey=${CELOSCAN_API_KEY}` : ''}`;
    const fetchCeloscan = async (qs: string) => {
      const url = `${CELOSCAN_API_BASE}?${withApiKey(qs)}`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`Celoscan HTTP ${res.status}`);
      const data = await res.json();
      return data;
    };
    if (!CELOSCAN_API_KEY) {
      console.warn('NEXT_PUBLIC_CELOSCAN_API_KEY not set; Celoscan requests may be rate-limited.');
    }

    const fetchTransactions = async () => {
      if (!address) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const publicClient = createPublicClient({
          chain: celo,
          transport: http('https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8', {
            timeout: 30_000,
            retryCount: 3,
          }),
        });

        const getPastYearBlockNumber = async (publicClient: any) => {
          const currentTime = Math.floor(Date.now() / 1000);
          const oneYearAgoTime = currentTime - 365 * 24 * 60 * 60;
          const apiKey = process.env.NEXT_PUBLIC_CELOSCAN_API_KEY;
          const response = await fetch(`https://api.celoscan.io/api?module=block&action=getblocknobytime&timestamp=${oneYearAgoTime}&closest=after&apikey=${apiKey}`);
          const data = await response.json();

          return data.result;
        };

        const getCurrentBlockNumber = async (publicClient: any) => {
          const currentTime = Math.floor(Date.now() / 1000);
          const apiKey = process.env.NEXT_PUBLIC_CELOSCAN_API_KEY;
          const response = await fetch(`https://api.celoscan.io/api?module=block&action=getblocknobytime&timestamp=${currentTime}&closest=after&apikey=${apiKey}`);
          const data = await response.json();

          return data.result;
        };

        const pastYearBlockNumber = await getPastYearBlockNumber(publicClient);
        const latestBlock = await getCurrentBlockNumber(publicClient);

        const data = await fetchCeloscan(
          `module=account&action=txlist&address=${address}&startblock=${pastYearBlockNumber}&endblock=${latestBlock}&page=${page}&offset=10&sort=desc`
        );

        if (Array.isArray(data.result)) {
          const txList: Transaction[] = data.result.map((tx: any, index: number) => {
            let functionName = '';
            try {
              const decodedInput = decodeFunctionData({
                abi: stableTokenABI,
                data: tx.input,
              });
              functionName = decodedInput?.functionName || 'Transfer';
            } catch (e) {
              functionName = tx.input === '0x' ? 'Transfer' : 'Contract Interaction';
            }

            // Determine token info
            const toAddress = tx.to?.toLowerCase();
            const tokenInfo = TOKEN_ADDRESSES[toAddress];

            // For token transfers, check if there's a tokenValue field
            let value = tx.value;
            let tokenSymbol = 'CELO';

            if (tx.tokenValue) {
              // This is a token transfer
              value = tx.tokenValue;
              tokenSymbol = tx.tokenName || 'Token';
            }

            return {
              args: {
                from: tx.from,
                to: tx.to,
                value: value,
                functionName,
              },
              transactionHash: tx.hash,
              timestamp: tx.timeStamp,
              key: index,
              status: tx.isError === '0',
              input: tx.input,
              tokenSymbol: tokenSymbol,
              tokenAddress: tx.to,
            };
          });

          setTransactions((prev) => {
            const seen = new Set(prev.map(t => t.transactionHash));
            const merged = [...prev];
            for (const t of txList) {
              if (!seen.has(t.transactionHash)) merged.push(t);
            }
            return merged;
          });
        } else {
          // API returned an error or unexpected result
          if (data?.message === 'No transactions found') {
            // Not an error; simply no results for this page/range
            return;
          }
          if (data?.message) {
            setError(`Celoscan: ${data.message}`);
          } else {
            setError('Failed to load some transactions. Showing partial data.');
          }
        }
      } catch (error) {
        if ((error as any)?.name === 'AbortError') return;
        console.error('Error fetching transactions:', error);
        setError('Could not fetch transactions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
    return () => controller.abort();
  }, [address, page]);

  function formatValue(value: string, tokenSymbol: string = 'CELO', decimals = 4): string {
    const tokenInfo = Object.values(TOKEN_ADDRESSES).find(t => t.symbol === tokenSymbol);
    const tokenDecimals = tokenInfo?.decimals || 18;

    const balanceNumber = parseFloat(value) / Math.pow(10, tokenDecimals);

    if (isNaN(balanceNumber) || balanceNumber === 0) {
      return "0.00";
    }

    if (balanceNumber < 0.0001) {
      return balanceNumber.toExponential(2);
    }

    return balanceNumber.toFixed(decimals).replace(/\.?0+$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (transactionFilter === 'all') return true;
    if (transactionFilter === 'sent') return transaction.args.from.toLowerCase() === address?.toLowerCase();
    if (transactionFilter === 'received') return transaction.args.to.toLowerCase() === address?.toLowerCase();
    return true;
  });

  const copyToClipboard = (text: string, type: 'address' | 'hash') => {
    navigator.clipboard.writeText(text);
    if (type === 'hash') {
      setCopiedHash(text);
      setTimeout(() => setCopiedHash(''), 2000);
    }
  };

  const getFilterLabel = () => {
    switch (transactionFilter) {
      case 'sent': return 'Sent';
      case 'received': return 'Received';
      default: return 'All';
    }
  };

  const getFunctionDisplayName = (functionName: string) => {
    const functionMap: { [key: string]: string } = {
      'transfer': 'Transfer',
      'approve': 'Approve',
      'transferFrom': 'Transfer From',
      'mint': 'Mint',
      'burn': 'Burn',
      'swap': 'Swap',
      'addLiquidity': 'Add Liquidity',
      'removeLiquidity': 'Remove Liquidity',
      'stake': 'Stake',
      'unstake': 'Unstake',
      'claim': 'Claim Rewards',
      'withdraw': 'Withdraw',
      'deposit': 'Deposit',
      'execute': 'Execute',
      'claimRewards': 'Claim Rewards',
    };

    // Return mapped name if exists
    if (functionMap[functionName]) {
      return functionMap[functionName];
    }

    if (!functionName || functionName.trim() === '') {
      return 'Contract Call';
    }

    const formatted = functionName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();

    return formatted || 'Contract Call';
  };

  return (
    <Card className="border-none bg-white/50 backdrop-blur-md dark:bg-black/90 shadow-lg relative overflow-hidden">
      {/* Cybro gradient header accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300" />

      <CardHeader className="pt-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center dark:text-white">
              <span className="h-4 w-1 bg-yellow-500 mr-3 rounded-full" />
              Transaction History
            </CardTitle>
            <CardDescription className="mt-1">
              Track your recent transactions on the Celo network
            </CardDescription>
            {error && (
              <div className="mt-2 text-xs text-red-500 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                {getFilterLabel()}
                <ChevronDownIcon className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setTransactionFilter('all')}>
                All Transactions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTransactionFilter('sent')}>
                Sent Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTransactionFilter('received')}>
                Received Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoading && transactions.length === 0 ? (
            Array(4).fill(0).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 flex-1">
                  <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-5 w-24" />
              </div>
            ))
          ) : filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => {
              const isSent = transaction.args.from.toLowerCase() === address?.toLowerCase();
              const counterparty = isSent ? transaction.args.to : transaction.args.from;
              const amount = formatValue(transaction.args.value, transaction.tokenSymbol);
              const hasValue = parseFloat(transaction.args.value) > 0;

              return (
                <div
                  key={transaction.key}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 transition-all hover:shadow-lg hover:scale-[1.01] hover:border-yellow-200 dark:hover:border-yellow-800 bg-white dark:bg-gray-900/50"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0",
                      isSent
                        ? "bg-orange-100 dark:bg-orange-900/20"
                        : "bg-green-100 dark:bg-green-900/20"
                    )}>
                      {isSent ? (
                        <ArrowUpIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <ArrowDownIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm dark:text-white">
                          {hasValue ? (isSent ? 'Sent' : 'Received') : getFunctionDisplayName(transaction.args.functionName)}
                        </span>
                        {transaction.status ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        {!hasValue && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                            {transaction.args.functionName}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="truncate">
                          {hasValue ? (isSent ? 'To' : 'From') : 'Hash'} {truncateAddress(transaction.transactionHash)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(transaction.transactionHash, 'address')}
                          className="text-gray-400 hover:text-primary flex-shrink-0"
                          title="Copy transaction hash"
                        >
                          <CopyIcon className="h-3 w-3" />
                        </button>
                        <span className="text-gray-300 dark:text-gray-700">•</span>
                        <span className="flex-shrink-0">{formatDate(transaction.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    {hasValue && (
                      <div className="text-right">
                        <div className={cn(
                          "font-semibold text-base",
                          isSent ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"
                        )}>
                          {isSent ? '-' : '+'}{amount}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {transaction.tokenSymbol}
                        </div>
                      </div>
                    )}

                    <a
                      href={`https://celoscan.io/tx/${transaction.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors flex-shrink-0"
                      title="View on explorer"
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </a>

                    {/* Verified badge for known contracts */}
                    {TOKEN_ADDRESSES[transaction.tokenAddress?.toLowerCase() || ''] && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs px-1.5 py-0 h-5 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto bg-gray-100 dark:bg-gray-800 rounded-full h-16 w-16 flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                  <path d="M9 14L4 9M4 9L9 4M4 9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 10L20 15M20 15L15 20M20 15H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">No transactions yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {!address ? 'Connect your wallet to view transactions' : 'Your transactions will appear here'}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {filteredTransactions.length > 0 && (
        <CardFooter className="flex justify-center border-t border-gray-100 dark:border-gray-800 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => setPage(page + 1)}
            className="w-full sm:w-auto bg-yellow-400/20 border-yellow-500/60 text-yellow-700 dark:text-yellow-400 font-semibold hover:bg-yellow-400/30 hover:border-yellow-500/80 transition-all duration-300"
          >
            {isLoading ? (
              <>
                <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Show Older Transactions'
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default TransactionList;