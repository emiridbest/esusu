import React from 'react';
import { useMiniSafe } from '@/context/miniSafe/MiniSafeContext';

// Shadcn/UI Components
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

// Icons
import {
  ArrowUpIcon,
  InfoIcon,
  LoaderCircleIcon,
  AlertCircleIcon,
} from "lucide-react";

const WithdrawTab: React.FC = () => {
  const {
    selectedToken,
    isWaitingTx,
    handleWithdraw,
  } = useMiniSafe();

  // Get the current date to determine if withdrawal is allowed
  const currentDay = new Date().getDate();
  const isWithdrawalPeriod = currentDay >= 28 && currentDay <= 31;
  const daysLeft = isWithdrawalPeriod ? 0 : Math.max(28 - currentDay, 0);
  const progressValue = Math.max(((28 - currentDay) / 28) * 100, 0);

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
        <div className="flex items-center mb-4">
          <ArrowUpIcon className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-base font-medium">Withdraw {selectedToken}</h3>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Lock time remaining</span>
            <span className="text-sm">{daysLeft} days left</span>
          </div>
          
          <Progress 
            value={progressValue} 
            className="h-2" 
          />
          <p className="text-xs text-gray-500 mt-2">
            You can withdraw without penalty during withdrawal window
          </p>
        </div>

        <Button
          onClick={handleWithdraw}
          disabled={!isWithdrawalPeriod || isWaitingTx}
          className="w-full"
        >
          {isWaitingTx ? (
            <LoaderCircleIcon className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ArrowUpIcon className="h-4 w-4 mr-2" />
          )}
          {isWithdrawalPeriod ? 'Withdraw All' : 'Locked'}
        </Button>

        {!isWithdrawalPeriod && (
          <p className="text-center text-sm text-red-500 mt-3">
            <AlertCircleIcon className="h-4 w-4 inline mr-1" />
            Your funds are still locked. Use Break Lock to withdraw early.
          </p>
        )}
      </div>

      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start">
          <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
          <AlertDescription>
            When you withdraw after the lock period, you will receive your original deposit plus any earned rewards.
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
};

export default WithdrawTab;