import React from 'react';
import { useMiniSafe } from '@/context/miniSafe/MiniSafeContext';

// Shadcn/UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Icons
import {
  ArrowDownIcon,
  InfoIcon,
  LoaderCircleIcon,
  CheckCircleIcon,
} from "lucide-react";

const DepositTab: React.FC = () => {
  const {
    depositAmount,
    setDepositAmount,
    selectedToken,
    isApproved,
    isApproving,
    isWaitingTx,
    approveSpend,
    handleDeposit,
  } = useMiniSafe();

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
        <div className="flex items-center mb-4">
          <ArrowDownIcon className="h-5 w-5 text-green-500 mr-2" />
          <h3 className="text-base font-medium">Deposit {selectedToken}</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Deposited assets are locked to earn rewards. Withdrawals are only available during the monthly window (28th-31st).
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="amount-input" className="text-sm font-medium">Amount</label>
            <Input
              id="amount-input"
              type="number"
              value={depositAmount || ''}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              placeholder={`Enter ${selectedToken} amount`}
              min="0"
              step="0.01"
              aria-label="Amount"
            />
            {selectedToken === 'cUSD' && (
              <p className="text-xs text-gray-500">Approve amount before depositing</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {selectedToken === 'cUSD' || 'G$' ? (
              <>
                <Button
                  variant={isApproved ? "outline" : "default"}
                  onClick={approveSpend}
                  disabled={isApproved || isApproving}
                >
                  {isApproving ? (
                    <LoaderCircleIcon className="h-4 w-4 animate-spin mr-2" />
                  ) : isApproved ? (
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                  ) : null}
                  {isApproved ? 'Approved' : 'Approve'}
                </Button>

                <Button
                  onClick={handleDeposit}
                  disabled={!isApproved || isWaitingTx || depositAmount <= 0}
                >
                  {isWaitingTx ? (
                    <LoaderCircleIcon className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 mr-2" />
                  )}
                  Deposit
                </Button>
              </>
            ) : (
              <Button
                onClick={handleDeposit}
                disabled={isWaitingTx || depositAmount <= 0}
                className="col-span-2"
              >
                {isWaitingTx ? (
                  <LoaderCircleIcon className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 mr-2" />
                )}
                Deposit {selectedToken}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-primary/5 p-4 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center">
          <InfoIcon className="h-4 w-4 mr-2 text-primary" />
          What happens when you deposit?
        </h4>
        <ul className="text-sm space-y-2 text-gray-600 dark:text-gray-300">
          <li className="flex items-start">
            <div className="mr-2 mt-1 bg-primary/20 text-primary h-4 w-4 rounded-full flex items-center justify-center text-xs">1</div>
            <span>Your assets are locked in a smart contract</span>
          </li>
          <li className="flex items-start">
            <div className="mr-2 mt-1 bg-primary/20 text-primary h-4 w-4 rounded-full flex items-center justify-center text-xs">2</div>
            <span>Withdrawal window is between 28th to 30th day monthly </span>
          </li>
          <li className="flex items-start">
            <div className="mr-2 mt-1 bg-primary/20 text-primary h-4 w-4 rounded-full flex items-center justify-center text-xs">3</div>
            <span>You earn rewards proportional to your deposit amount over time.</span>
          </li>
          <li className="flex items-start">
            <div className="mr-2 mt-1 bg-primary/20 text-primary h-4 w-4 rounded-full flex items-center justify-center text-xs">4</div>
            <span>Withdrawing outside the monthly window incurs a 5% penalty.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DepositTab;