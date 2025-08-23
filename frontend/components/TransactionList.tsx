"use client";
import React, { useEffect, useState } from 'react';
import { Celo } from '@celo/rainbowkit-celo/chains';
import { createPublicClient, http, decodeFunctionData } from 'viem';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
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
  key: number;
  status: boolean;
  timestamp?: string;
}

const truncateAddress = (address: string): string => {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
};

const formatDate = (timestamp: string | undefined): string => {
  if (!timestamp) return 'Unknown date';
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const TransactionList: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState(1);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'sent' | 'received'>('all');
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);

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
        // Don't show error, just set loading to false and wait for address
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const publicClient = createPublicClient({
          chain: Celo,
          transport: http(),
        });

        const getPastYearBlockNumber = async (publicClient: any) => {
          const currentTime = Math.floor(Date.now() / 1000);
          const oneYearAgoTime = currentTime - 365 * 24 * 60 * 60; 

          try {
            const data = await fetchCeloscan(`module=block&action=getblocknobytime&timestamp=${oneYearAgoTime}&closest=after`);
            if (data?.status === '1' && data?.result) return data.result;
          } catch (e) {
            // ignore and fallback
          }
          // Fallback: earliest block
          return '0';
        };

        const getCurrentBlockNumber = async (publicClient: any) => {
          const currentTime = Math.floor(Date.now() / 1000);
          try {
            const data = await fetchCeloscan(`module=block&action=getblocknobytime&timestamp=${currentTime}&closest=after`);
            if (data?.status === '1' && data?.result) return data.result;
          } catch (e) {
            // ignore and fallback
          }
          // Fallback to RPC latest block
          const latest = await publicClient.getBlockNumber();
          return latest.toString();
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

            return {
              args: {
                from: tx.from,
                to: tx.to,
                value: tx.value,
                functionName,
              },
              transactionHash: tx.hash,
              timestamp: tx.timeStamp,
              key: index,
              status: tx.isError === '0',
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

  function formatValue(value: string, decimals = 2): string {
    const balanceNumber = parseFloat(value);
    if (isNaN(balanceNumber)) {
      return "0.00";
    }
    return balanceNumber.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (transactionFilter === 'all') return true;
    if (transactionFilter === 'sent') return transaction.args.from === address;
    if (transactionFilter === 'received') return transaction.args.from !== address;
    return true;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="border-none bg-white/50 backdrop-blur-md dark:bg-gray-800/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center dark:text-white/70">
              <span className="h-4 w-1 bg-primary mr-3 rounded-ful"></span>
              Transaction History
            </CardTitle>
            <CardDescription>
              View your recent activity on Celo blockchain
            </CardDescription>
            {error && (
              <div className="mt-2 text-xs text-red-500 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1, bg-black">
                Filter
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTransactionFilter('all')}>
                All Transactions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTransactionFilter('sent')}>
                Sent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTransactionFilter('received')}>
                Received
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="compact">Compact View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="space-y-4">
            {isLoading && transactions.length === 0 ? (
              Array(3).fill(0).map((_, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              ))
            ) : filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <div 
                  key={transaction.key} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-3 mb-3 sm:mb-0">
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full",
                      transaction.args.from === address 
                        ? "bg-red-100 dark:bg-red-900/20" 
                        : "bg-green-100 dark:bg-green-900/20"
                    )}>
                      {transaction.args.from === address ? (
                        <ArrowUpIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <ArrowDownIcon className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium dark:text-white">
                          {transaction.args.from === address ? 'To: ' : 'From: '}
                          {transaction.args.from === address 
                            ? truncateAddress(transaction.args.to) 
                            : truncateAddress(transaction.args.from)}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(transaction.args.from === address ? transaction.args.to : transaction.args.from)}
                          className="ml-2 text-gray-400 hover:text-primary"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span>
                          {formatValue((parseFloat(transaction.args.value) * 1e-18).toFixed(18))} CELO
                        </span>
                        <span className="hidden sm:block text-gray-300 dark:text-gray-600">•</span>
                        <Badge variant={transaction.args.functionName === 'transfer' ? 'outline' : 'secondary'} className="px-2 py-0 h-5">
                          {transaction.args.functionName}
                        </Badge>
                        <span className="hidden sm:block text-gray-300 dark:text-gray-600">•</span>
                        <span>{formatDate(transaction.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-12 sm:ml-0">
                    {transaction.status ? (
                      <Badge variant="secondary" className="px-2 py-0 h-5 bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 flex items-center gap-1">
                        <CheckCircleIcon className="h-3 w-3" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="px-2 py-0 h-5 bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 flex items-center gap-1">
                        <XCircleIcon className="h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                    <a
                      href={`https://celoscan.io/tx/${transaction.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                    >
                      View
                      <ExternalLinkIcon className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto bg-gray-50 dark:bg-gray-800 rounded-full h-12 w-12 flex items-center justify-center mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                    <path d="M9 14L4 9M4 9L9 4M4 9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 10L20 15M20 15L15 20M20 15H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try a different filter or connect your wallet</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="compact">
            <div className="space-y-1">
              {isLoading && transactions.length === 0 ? (
                Array(5).fill(0).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                ))
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <a
                    key={transaction.key}
                    href={`https://celoscan.io/tx/${transaction.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {transaction.args.from === address ? (
                        <ArrowUpIcon className="h-4 w-4 text-red-500" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 text-green-500" />
                      )}
                      <span className="font-medium text-sm dark:text-gray-200">
                        {transaction.args.from === address ? 'Sent to ' : 'Received from '}
                        {truncateAddress(transaction.args.from === address ? transaction.args.to : transaction.args.from)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium dark:text-gray-300">
                        {formatValue((parseFloat(transaction.args.value) * 1e-18).toFixed(18))} CELO
                      </span>
                    </div>
                  </a>
                ))
              ) : (
                <div className="text-center py-4 text-gray-400">No transactions found</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-center border-t border-gray-100 dark:border-gray-700 pt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          onClick={() => setPage(page + 1)}
          className="w-full sm:w-auto, bg-black"
        >
          {isLoading ? (
            <>
              <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
              Loading
            </>
          ) : (
            'Load More Transactions'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TransactionList;