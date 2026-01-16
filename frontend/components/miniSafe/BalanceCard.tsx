import React from 'react';
import { useMiniSafe } from '@/context/miniSafe/MiniSafeContext';
import { formatUnits } from "ethers";

// Shadcn/UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TOKENS } from "../../utils/tokens";
import { TrustScore } from '@/components/ui/TrustScore';

// Icons
import {
  WalletIcon,
  CoinsIcon,
  ClockIcon,
  RefreshCwIcon,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const BalanceCard: React.FC = () => {
  const {
    cusdBalance,
    usdcBalance,
    usdtBalance,
    selectedToken,
    handleTokenChange,
    isLoading,
    getBalance,
    formatBalance,
  } = useMiniSafe();

  const trustFactors = [
    { label: 'Protocol', value: 'Aave V3', status: 'good' as const },
    { label: 'Asset Type', value: 'Stablecoin', status: 'good' as const },
    { label: 'Audit Status', value: 'Verified', status: 'good' as const },
  ];

  return (
    <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-gray-100 dark:border-gray-700 overflow-hidden h-full dark:text-white relative group">
      {/* Vault glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/20 via-yellow-500/10 to-transparent blur-xl opacity-50 dark:opacity-30 animate-pulse" />

      {/* Premium gradient line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 z-10" />

      {/* Hover glow orb */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl group-hover:bg-yellow-400/20 transition-all duration-700" />

      <CardHeader className="pb-2 relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center">
              <WalletIcon className="mr-2 h-5 w-5 text-yellow-600 dark:text-yellow-500" />

              My Savings Vault
            </CardTitle>
            <CardDescription>Secured by Aave V3 Protocol</CardDescription>
          </div>
          <TrustScore score={98} factors={trustFactors} size="sm" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative z-10 pt-4">
        {isLoading ? (
          <>
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {/* Main Balance Display */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Value</span>
                <Badge variant="outline" className="text-[10px] py-0 h-5 bg-green-50 text-green-700 border-green-200 gap-1">
                  <TrendingUp className="h-3 w-3" /> APY ~4.5%
                </Badge>
              </div>
              <div className="bg-transparent text-3xl font-bold flex items-baseline gap-1">
                {/* Simplified total logic for display - in real app summarize all */}
                {cusdBalance ? formatBalance(formatUnits(cusdBalance || '0', 18)) : '0.00'}
                <span className="text-sm font-normal text-muted-foreground">cUSD</span>
              </div>
            </div>

            {/* Asset Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-transparent hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    {TOKENS['USDC']?.logoUrl ? <img src={TOKENS['USDC'].logoUrl} alt="USDC" className="w-4 h-4" /> : <CoinsIcon className="h-3 w-3 text-blue-600" />}
                  </div>
                  <span className="text-xs font-medium">USDC</span>
                </div>
                <div className="text-lg font-semibold">{usdcBalance ? formatBalance(formatUnits(usdcBalance || '0', 6)) : '0.00'}</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-transparent hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                    {TOKENS['USDT']?.logoUrl ? <img src={TOKENS['USDT'].logoUrl} alt="USDT" className="w-4 h-4" /> : <CoinsIcon className="h-3 w-3 text-green-600" />}
                  </div>
                  <span className="text-xs font-medium">USDT</span>
                </div>
                <div className="text-lg font-semibold">{usdtBalance ? formatBalance(formatUnits(usdtBalance || '0', 6)) : '0.00'}</div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground">Active Asset</label>
            <span className="text-[10px] text-primary cursor-pointer hover:underline">View Analytics</span>
          </div>
          <Select
            value={selectedToken}
            onValueChange={handleTokenChange}
          >
            <SelectTrigger className="w-full bg-background/50 border-primary/20 focus:ring-primary/20 h-10">
              <SelectValue placeholder="Select token">
                {selectedToken && (
                  <div className="flex items-center gap-2 font-medium">
                    {TOKENS[selectedToken]?.logoUrl && (
                      <img src={TOKENS[selectedToken].logoUrl} alt={selectedToken} className="w-5 h-5" />
                    )}
                    <span>{selectedToken}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {['CUSD', 'USDC', 'USDT'].map((tokenSymbol) => (
                <SelectItem key={tokenSymbol} value={tokenSymbol}>
                  <div className="flex items-center gap-2">
                    {TOKENS[tokenSymbol]?.logoUrl && (
                      <img src={TOKENS[tokenSymbol].logoUrl} alt={tokenSymbol} className="w-4 h-4" />
                    )}
                    <span>{tokenSymbol}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>

      <CardFooter className="border-t border-gray-100 dark:border-gray-700 pt-3 pb-3 flex items-center justify-between text-[11px] text-muted-foreground bg-gray-50/50 dark:bg-black/20">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
          <span>Audited by CertiK</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] hover:bg-primary/10 hover:text-primary"
          onClick={() => getBalance()}
        >
          <RefreshCwIcon className="h-3 w-3 mr-1" />
          Sync
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BalanceCard;
