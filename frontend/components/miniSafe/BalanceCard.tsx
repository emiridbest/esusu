import React from 'react';
import { useMiniSafe } from '@/context/miniSafe/MiniSafeContext';
import { formatUnits } from "ethers";

// Shadcn/UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import {
  WalletIcon,
  CoinsIcon,
  ClockIcon,
  InfoIcon,
  RefreshCwIcon,
} from "lucide-react";

const BalanceCard: React.FC = () => {
  const {
    cusdBalance,
    usdcBalance,
    usdtBalance,
    tokenBalance,
    selectedToken,
    handleTokenChange,
    isLoading,
    getBalance,
    getTokenBalance,
    formatBalance,
    interestRate,
  } = useMiniSafe();


  return (
    <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-gray-100 dark:border-gray-700 overflow-hidden h-full dark:text-white">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/70 via-primary/40 to-primary/10"></div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center">
          <WalletIcon className="mr-2 h-5 w-5 text-primary" />
          My Savings
        </CardTitle>
        <CardDescription>Manage your secured assets</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <>
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-full" />
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">CUSD Balance</div>
                <Badge variant="outline" className="text-xs">Stablecoin</Badge>
              </div>
              <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-md p-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mr-2">
                    <CoinsIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="font-medium">CUSD</span>
                </div>
                <div className="text-xl font-bold">{cusdBalance ? formatBalance(formatUnits(cusdBalance || '0', 18)) : '0.00'}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">USDC Balance</div>
                <Badge variant="outline" className="text-xs">Stablecoin</Badge>
              </div>
              <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-md p-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-2">
                    <CoinsIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="font-medium">USDC</span>
                </div>
                <div className="text-xl font-bold">{usdcBalance ? formatBalance(formatUnits(usdcBalance || '0', 6)) : '0.00'}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">USDT Balance</div>
                <Badge variant="outline" className="text-xs">Stablecoin</Badge>
              </div>
              <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-md p-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-2">
                    <CoinsIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-medium">USDT</span>
                </div>
                <div className="text-xl font-bold">{usdtBalance ? formatBalance(formatUnits(usdtBalance || '0', 18)) : '0.00'}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">EST Tokens</div>
                <Badge className="bg-black text-primary hover:bg-black/70 text-xs">Reward Token</Badge>
              </div>
              <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent rounded-md p-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                    <CoinsIcon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">EST</span>
                </div>
                <div className="text-xl font-bold">{tokenBalance}</div>
              </div>
            </div>
          </>
        )}

        <div className="pt-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Select token</div>
          <Select
            value={selectedToken}
            onValueChange={handleTokenChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select token" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CUSD">CUSD</SelectItem>
              <SelectItem value="USDC">USDC</SelectItem>
              <SelectItem value="USDT">USDT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {usdcBalance && parseFloat(formatUnits(usdcBalance || '0', 6)) > 0 && (
          <Alert className="bg-primary/5 border-primary/20">
            <div className="flex items-start">
              <InfoIcon className="h-5 w-5 text-primary mr-2 mt-0.5" />
              <AlertDescription className="text-sm">
                Your assets are earning approximately {interestRate}% APY in EST tokens
              </AlertDescription>
            </div>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center">
          <ClockIcon className="h-3 w-3 mr-1" />
          <span>Updated just now</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-gray-500"
          onClick={() => {
            getBalance();
            getTokenBalance();
          }}
        >
          <RefreshCwIcon className="h-3 w-3 mr-1 text-gray-500" />
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BalanceCard;
