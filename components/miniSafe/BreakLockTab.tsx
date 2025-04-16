import React from 'react';
import { useMiniSafe } from '@/context/miniSafe/MiniSafeContext';

// Shadcn/UI Components
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  UnlockIcon,
  LockIcon,
  LoaderCircleIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from "lucide-react";

const BreakLockTab: React.FC = () => {
  const {
    selectedToken,
    tokenBalance,
    isWaitingTx,
    handleBreakLock,
  } = useMiniSafe();

  // EST tokens required to break lock
  const requiredEstTokens = 15;
  const hasEnoughTokens = parseInt(tokenBalance) >= requiredEstTokens;
  const tokenPercentage = Math.min((parseInt(tokenBalance) / requiredEstTokens) * 100, 100);

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
        <div className="flex items-center mb-4">
          <UnlockIcon className="h-5 w-5 text-amber-500 mr-2" />
          <h3 className="text-base font-medium">Break Timelock</h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Use your EST tokens to break the timelock and withdraw your funds outside withdrawal window. This will consume your EST tokens.
        </p>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
          <div className="flex items-start">
            <div className="mr-3 mt-0.5">
              <LockIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Required EST Tokens</h4>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                You need <span className="font-bold">{requiredEstTokens} EST</span> tokens to break this timelock
              </p>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs">Your balance:</span>
                <span className="text-xs font-medium">{tokenBalance} EST</span>
              </div>
              <Progress
                value={tokenPercentage}
                className="h-1.5 mt-1"
              />

              <p className="mt-2 text-xs">
                {hasEnoughTokens ? (
                  <span className="text-green-600 dark:text-green-400">
                    <CheckCircleIcon className="h-3 w-3 inline mr-1" />
                    You have enough EST tokens
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    <AlertCircleIcon className="h-3 w-3 inline mr-1" />
                    You need {requiredEstTokens - parseInt(tokenBalance)} more EST tokens
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="default"
          onClick={handleBreakLock}
          disabled={!hasEnoughTokens || isWaitingTx}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          {isWaitingTx ? (
            <LoaderCircleIcon className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <UnlockIcon className="h-4 w-4 mr-2" />
          )}
          Break Lock & Withdraw
        </Button>
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <h4 className="font-medium mb-3">How it works</h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Breaking the timelock early will consume your EST tokens. You will receive your original deposit plus any earned rewards.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Note: EST tokens are non-transferable and can only be used to break timelocks.
        </p>
      </div>
    </div>
  );
};

export default BreakLockTab;