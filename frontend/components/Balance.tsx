"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { getContract, formatEther, createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { BrowserProvider } from 'ethers';
import { stableTokenABI } from "@celo/abis";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  EyeIcon, 
  EyeOffIcon, 
  WalletIcon, 
  ClockIcon, 
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';

const STABLE_TOKEN_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

const Balance: React.FC = () => {
  const router = useRouter();
  const [cUSDBalance, setCUSDBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showBalanceDetails, setShowBalanceDetails] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    setCurrentDate(new Date().toLocaleDateString());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const getCUSDBalance = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        setIsLoading(true);
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const publicClient = createPublicClient({
          chain: celo,
          transport: http(),
        });

        const StableTokenContract = getContract({
          abi: stableTokenABI,
          address: STABLE_TOKEN_ADDRESS,
          publicClient,
        });
        
        const address = await signer.getAddress();
        let cleanedAddress = address.substring(2);
        const balanceInBigNumber = await StableTokenContract.read.balanceOf([`0x${cleanedAddress}`]);
        const balanceInWei = balanceInBigNumber;
        const balanceInEthers = formatEther(balanceInWei);

        setCUSDBalance(balanceInEthers);
      } catch (error) {
        console.error('Error fetching cUSD balance:', error);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getCUSDBalance();
  }, [getCUSDBalance]);

  const toggleBalanceDetails = () => {
    setShowBalanceDetails(!showBalanceDetails);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    getCUSDBalance();
  };

  function formatBalance(balance: string, decimals = 2) {
    const balanceNumber = parseFloat(balance);
    if (isNaN(balanceNumber)) {
      return "0.00";
    }
    return balanceNumber.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  const maskBalance = (balance: string) => {
    return "*".repeat(balance.length > 5 ? 5 : balance.length);
  };

  return (
    <Card className="bg-white/50 dark:bg-gradient-to-r from-primary/20 to-purple-500/20 backdrop-blur-md border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/70 via-primary/40 to-primary/10"></div>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-black dark:bg-primary/10 rounded-full p-2">
              <WalletIcon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-medium text-gray-900 dark:text-white">Wallet Balance</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleBalanceDetails}
              className="bg-black dark:bg-primary/10 h-8 w-8 rounded-full"
            >
              {showBalanceDetails ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
              <span className="sr-only">
                {showBalanceDetails ? "Hide" : "Show"} balance
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className={cn(
                "bg-black dark:bg-primary/10 h-8 w-8 rounded-full",
                refreshing && "animate-spin"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
              <span className="sr-only">Refresh balance</span>
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Balance Display */}
          <div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                <motion.div
                  key={cUSDBalance}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-baseline"
                >
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                    {showBalanceDetails
                      ? formatBalance(cUSDBalance)
                      : maskBalance(formatBalance(cUSDBalance))}
                  </h1>
                  <span className="ml-2 text-lg font-medium text-gray-600 dark:text-gray-400">
                    cUSD
                  </span>
                </motion.div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  ~${formatBalance(cUSDBalance)} USD
                </p>
              </>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button 
              variant="outline"
              size="sm" 
              className="bg-black dark:bg-transparent border-primary/20 text-primary hover:bg-primary/10 rounded-full flex items-center gap-1.5 px-4"
              onClick={() => router.push('/miniSafe')}
            >
              <ArrowDownIcon className="h-3.5 w-3.5" />
              Deposit
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="bg-black dark:bg-transparent border-primary/20 text-primary hover:bg-primary/10 rounded-full flex items-center gap-1.5 px-4"
              onClick={() => router.push('/miniSafe')}
            >
              <ArrowUpIcon className="h-3.5 w-3.5" />
              Withdraw
            </Button>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between pt-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              <span>{currentTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span>{currentDate}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Balance;