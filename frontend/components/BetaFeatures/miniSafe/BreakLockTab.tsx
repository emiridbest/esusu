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
    isWaitingTx,
    handleBreakLock,
  } = useMiniSafe();

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
        <div className="flex items-center mb-4">
          <UnlockIcon className="h-5 w-5 text-amber-500 mr-2" />
          <h3 className="text-base font-medium">Break Timelock</h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          <strong>Need to withdraw before the 28th?</strong> You can break the timelock to withdraw your funds immediately. This action will incur a 5% penalty on your total balance.
        </p>

        <Button
          variant="default"
          onClick={handleBreakLock}
          disabled={isWaitingTx}
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
          Breaking the timelock allows you to withdraw your funds immediately, but a 5% penalty will be deducted from your total balance (deposit + rewards).
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Network gas fees apply.</p>
      </div>
    </div>
  );
};

export default BreakLockTab;