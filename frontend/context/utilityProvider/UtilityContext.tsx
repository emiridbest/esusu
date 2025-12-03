"use client";

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { parseUnits, encodeFunctionData, parseAbi } from "viem";
import { ethers } from 'ethers';
import {
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
} from "thirdweb/react";
import { client, activeChain } from "@/lib/thirdweb";
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
import { CountryData } from '@/utils/countryData';
import { celo } from 'wagmi/chains';
import { useGasSponsorship } from '@/hooks/useGasSponsorship';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TransactionSteps, Step, StepStatus } from '@/components/TransactionSteps';

// The recipient wallet address for all utility payments
const RECIPIENT_WALLET = '0xb82896C4F251ed65186b416dbDb6f6192DFAF926';



type UtilityContextType = {
  isProcessing: boolean;
  countryData: CountryData | null;
  setIsProcessing: (processing: boolean) => void;
  convertCurrency: (amount: string, base_currency: string) => Promise<number>;
  handleTransaction: (params: TransactionParams) => Promise<TransactionResult>;
  getTransactionMemo: (type: 'data' | 'electricity' | 'airtime', metadata: Record<string, any>) => string;
  formatCurrencyAmount: (amount: string | number) => string;

  // Transaction dialog
  isTransactionDialogOpen: boolean;
  setIsTransactionDialogOpen: (open: boolean) => void;
  setTransactionSteps: (steps: Step[]) => void;
  setCurrentOperation: (operation: 'data' | 'electricity' | 'airtime' | null) => void;
  isWaitingTx?: boolean;
  setIsWaitingTx?: (waiting: boolean) => void;
  closeTransactionDialog: () => void;
  openTransactionDialog: (operation: 'data' | 'electricity' | 'airtime', recipientValue: string) => void;
  transactionSteps: Step[];
  currentOperation: "data" | "electricity" | "airtime" | null;
  updateStepStatus: (stepId: string, status: StepStatus, errorMessage?: string) => void;
};


type TransactionParams = {
  type: 'data' | 'electricity' | 'airtime';
  amount: string;
  token: string;
  recipient: string;
  metadata: Record<string, any>;
};

// Result returned by handleTransaction
type TransactionResult = {
  success: boolean;
  transactionHash?: string;
  convertedAmount?: string;
  paymentToken?: string;
};

type UtilityProviderProps = {
  children: ReactNode;
};

// Create the context
const UtilityContext = createContext<UtilityContextType | undefined>(undefined);

// Provider component
export const UtilityProvider = ({ children }: UtilityProviderProps) => {
  // Cache token prices (CELO/USD, G$/USD)
  const [celoUsdPrice, setCeloUsdPrice] = useState<number>(2.8); // fallback to 2.8
  const [goodDollarUsdPrice, setGoodDollarUsdPrice] = useState<number>(0.0001); // fallback to 0.0001

  // Fetch token prices once per session (or on demand)
  useEffect(() => {
    async function fetchPrices() {
      try {
        const celoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd');
        const celoData = await celoRes.json();
        if (celoData.celo && celoData.celo.usd) setCeloUsdPrice(celoData.celo.usd);
        const gdRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=gooddollar&vs_currencies=usd');
        const gdData = await gdRes.json();
        if (gdData.gooddollar && gdData.gooddollar.usd) setGoodDollarUsdPrice(gdData.gooddollar.usd);
      } catch (err) {
        // fallback to defaults
      }
    }
    fetchPrices();
  }, []);
  const usdcAddress = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
  const cusdAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  const usdtAddress = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
  const celoAddress = "0x471EcE3750Da237f93B8E339c536989b8978a438"; // Native CELO token
  const goodDollarAddress = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A"; // G$ token address
  const [recipient, setRecipient] = useState<string>('');
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState<Step[]>([]);
  const [currentOperation, setCurrentOperation] = useState<'data' | 'electricity' | 'airtime' | null>(null);
  const [isWaitingTx, setIsWaitingTx] = useState(false);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const chain = useActiveWalletChain();
  
  const address = account?.address;
  const { checkAndSponsor } = useGasSponsorship();

  const convertCurrency = async (
    amount: string,
    base_currency: string
  ): Promise<number> => {

    try {
      const sourceCurrency = base_currency;
      // Validate the amount
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error('Invalid amount for currency conversion');
      }
      const response = await fetch('/api/exchange-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          base_currency: sourceCurrency
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert currency');
      }

      const data = await response.json();
      return parseFloat(data.toAmount);
    } catch (error) {
      console.error('Currency conversion error:', error);
      toast.error('Failed to convert currency');
      throw error;
    }
  };

  const getTokenAddress = (token: string) => {
    switch (token) {
      case 'USDC':
        return usdcAddress;
      case 'CUSD':
        return cusdAddress;
      case 'USDT':
        return usdtAddress;
      case 'CELO':
        return celoAddress;
      case 'G$':
        return goodDollarAddress;
      default:
        return cusdAddress;
    }
  };

  const getTokenDecimals = (token: string): number => {
    switch (token) {
      case 'CUSD':
        return 18;
      case 'USDC':
      case 'USDT':
        return 6;
      default:
        return 18;
    }
  };

  // Format currency amount with the appropriate symbol
  const formatCurrencyAmount = (amount: string | number): string => {
    if (!countryData) return `${amount}`;

    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Format the number with commas for thousands
    const formattedNumber = numericAmount.toLocaleString('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });

    return `${countryData?.currency?.symbol || '₦'}${formattedNumber}`;
  };

  // Generate a transaction memo/description based on utility type
  const getTransactionMemo = (type: 'data' | 'electricity' | 'airtime', metadata: Record<string, any>): string => {
    switch (type) {
      case 'data':
        return `Data purchase for ${metadata.phone || 'unknown'} - ${metadata.dataBundle || 'unknown'} bundle`;
      case 'electricity':
        return `Electricity payment for meter ${metadata.meterNumber || 'unknown'} - ${metadata.meterType || 'unknown'}`;
      case 'airtime':
        return `Airtime purchase for ${metadata.phone || 'unknown'} - ${metadata.dataBundle || 'unknown'} bundle`;
      default:
        return 'Utility payment';
    }
  };


  // Update step status helper function
  const updateStepStatus = (stepId: string, status: StepStatus, errorMessage?: string) => {
    setTransactionSteps(prevSteps => prevSteps.map(step =>
      step.id === stepId
        ? { ...step, status, ...(errorMessage ? { errorMessage } : {}) }
        : step
    ));
  };



  // Enhanced transaction handler for all utility types
  const handleTransaction = async ({ type, amount, token, recipient, metadata }: TransactionParams): Promise<TransactionResult> => {


    console.log('[handleTransaction] Params:', { type, amount, token, recipient, metadata });
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      console.error('[handleTransaction] Invalid amount:', amount);
      toast.error('Please enter a valid amount');
      return { success: false };
    }
    // Ensure currencyCode is present before conversion
    const currencyCode = metadata?.countryCode || countryData?.currency?.code;
    if (!currencyCode) {
      console.error('[handleTransaction] Missing currencyCode:', metadata?.countryCode, countryData?.currency?.code);
      toast.error('Unable to determine currency for conversion. Please select a valid country and provider.');
      return { success: false };
    }
    setIsProcessing(true);
    try {
      // Convert the local currency amount to its equivalent in USD
      const convertedAmount = await convertCurrency(amount, currencyCode);
      console.log('[handleTransaction] Converted amount:', convertedAmount);

      if (convertedAmount <= 0) {
        console.error('[handleTransaction] Currency conversion failed:', convertedAmount);
        toast.error('Currency conversion failed. Please try again.');
        return { success: false };
      }

      // Get the token contract interface
      const tokenAddress = getTokenAddress(token);
      const decimals = getTokenDecimals(token);
      console.log('[handleTransaction] Token address:', tokenAddress, 'Decimals:', decimals);

      if (address) {
        // Prepare transaction memo based on utility type
        const memo = getTransactionMemo(type, metadata);
        console.log('[handleTransaction] Transaction memo:', memo);

        // Parse amount with correct decimals
        let paymentAmount = parseUnits(convertedAmount.toString(), decimals);
        console.log('[handleTransaction] Payment amount (parsed):', paymentAmount);

        // Apply token-specific conversion using cached rates
        if (token === 'G$') {
          // Convert USD to G$ using cached rate
          const gDollarAmount = Number(convertedAmount) / goodDollarUsdPrice;
          paymentAmount = parseUnits(gDollarAmount.toString(), decimals);
          console.log('[handleTransaction] G$ conversion applied:', paymentAmount);
        }
        if (token === 'CELO') {
          // Convert USD to CELO using cached rate
          const celoAmount = Number(convertedAmount) / celoUsdPrice;
          paymentAmount = parseUnits(celoAmount.toString(), decimals);
          console.log('[handleTransaction] CELO conversion applied:', paymentAmount);
        }

        // Prepare token transfer
        const erc20Abi = parseAbi(["function transfer(address to, uint256 value) returns (bool)"]);

        // Encode the transfer function
        const transferInterface = new ethers.Interface(erc20Abi);
        const transferData = transferInterface.encodeFunctionData("transfer", [
          RECIPIENT_WALLET,
          paymentAmount
        ]);
        const dataSuffix = getReferralTag({
          user: address as `0x${string}`,
          consumer: '0xb82896C4F251ed65186b416dbDb6f6192DFAF926',
        })
        // Append the Divvi data suffix
        const dataWithSuffix = transferData + dataSuffix;

        // Sponsor gas before sending the transfer
        try {
          const sponsorshipResult = await checkAndSponsor(address as `0x${string}`, {
            contractAddress: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [RECIPIENT_WALLET, paymentAmount],
          });

          if (sponsorshipResult.gasSponsored) {
            toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (gasError) {
          console.error('[UtilityContext] Gas sponsorship failed', gasError);
          // Continue even if sponsorship fails
        }

        // Send the transaction
        setIsWaitingTx(true);
        
        if (!wallet || !account) {
          console.error('[handleTransaction] Wallet or account not connected:', { wallet, account });
          throw new Error('Wallet not connected');
        }
        // Send transaction using Thirdweb v5 pattern
        const { sendTransaction, prepareTransaction } = await import('thirdweb');
        let transaction, txResult;
        try {
          const tx = await sendTransactionAsync({
            to: tokenAddress as `0x${string}`,
            data: dataWithSuffix as `0x${string}`,
          });
          client,
          chain: activeChain,
          });
          console.log('[handleTransaction] Transaction prepared:', transaction);
          txResult = await sendTransaction({
            account,
            transaction,
          });
          console.log('[handleTransaction] Transaction sent:', txResult);
        } catch (txError) {
          console.error('[handleTransaction] Transaction preparation/sending failed:', txError);
          throw txError;
        }
        const tx = { hash: txResult.transactionHash };

        // Submit the referral to Divvi
        try {
          await submitReferral({
            txHash: tx.hash as unknown as `0x${string}`,
            chainId: celo.id
          });
        } catch {
          // Do nothing
        }
        // Determine success message based on utility type
        let successMessage = '';
        switch (type) {
          case 'data':
            successMessage = `Successfully purchased data for ${recipient}`;
            break;
          case 'electricity':
            successMessage = `Successfully paid electricity bill for meter ${recipient}`;
            break;
          case 'airtime':
            successMessage = `Successfully purchased airtime for ${recipient}`;
            break;
        }
        toast.success(successMessage);
        return { 
          success: true, 
          transactionHash: tx.hash, 
          convertedAmount: convertedAmount.toString(),
          paymentToken: token 
        };
      } else {
        toast.error('Ethereum provider not found. Please install a Web3 wallet.');
        return { success: false };
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      toast.error('Transaction failed. Please try again.');
      // Find the current loading step and mark it as error
      const loadingStepIndex = transactionSteps.findIndex(step => step.status === 'loading');
      if (loadingStepIndex !== -1) {
        updateStepStatus(
          transactionSteps[loadingStepIndex].id,
          'error',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      return { success: false };
    } finally {
      setIsProcessing(false);
      setIsWaitingTx(false);
    }
  };


  // Get dialog title based on current operation
  const getDialogTitle = () => {
    switch (currentOperation) {
      case 'data':
        return 'Purchase Data Bundle';
      case 'electricity':
        return 'Pay Electricity Bill';
      case 'airtime':
        return 'Purchase Airtime';
      default:
        return 'Transaction';
    }
  };
  const openTransactionDialog = (operation: 'data' | 'electricity' | 'airtime', recipientValue: string) => {
    setCurrentOperation(operation);
    setRecipient(recipientValue);
    setIsTransactionDialogOpen(true);
    setIsTransactionDialogOpen(true);
    let steps: Step[] = [];
    if (operation === 'data') {
      steps = [
        {
          id: 'verify-phone',
          title: 'Verify Phone Number',
          description: `Verifying phone number for ${recipient}`,
          status: 'inactive'
        },
        {
          id: 'check-balance',
          title: 'Check Balance',
          description: `Checking your wallet balance`,
          status: 'inactive'
        },
        {
          id: 'send-payment',
          title: 'Send Payment',
          description: `Sending payment for ${recipient}`,
          status: 'inactive'
        },
        {
          id: 'top-up',
          title: 'Perform Top Up',
          description: `Confirming data purchase for ${recipient}`,
          status: 'inactive'
        }
      ];
    } else if (operation === 'electricity') {
      steps = [
        {
          id: 'check-balance',
          title: 'Check Balance',
          description: `Checking your wallet balance`,
          status: 'inactive'
        },
        {
          id: 'send-payment',
          title: 'Send Payment',
          description: `Sending payment for meter ${recipient}`,
          status: 'inactive'
        },
        {
          id: 'electricity-payment',
          title: 'Pay Electricity Bill',
          description: `Paying electricity bill for meter ${recipient}`,
          status: 'inactive'
        }
      ];
    } else if (operation === 'airtime') {
      steps = [
        {
          id: 'verify-phone',
          title: 'Verify Phone Number',

          description: `Verifying phone number for ${recipient}`,
          status: 'inactive'
        },
        {
          id: 'check-balance',
          title: 'Check Balance',
          description: `Checking your wallet balance`,
          status: 'inactive'
        },
        {
          id: 'send-payment',
          title: 'Send Payment',
          description: `Sending payment for ${recipient}`,
          status: 'inactive'
        },
        {
          id: 'top-up',

          title: 'Perform Top Up',
          description: `Confirming airtime purchase for ${recipient}`,
          status: 'inactive'
        }
      ];
    }
    setTransactionSteps(steps);
  };

  // Check if all steps are completed
  const allStepsCompleted = transactionSteps.every(step => step.status === 'success');
  const hasError = transactionSteps.some(step => step.status === 'error');
  const closeTransactionDialog = () => {
    setIsTransactionDialogOpen(false);
    setCurrentOperation(null);
    // Reset steps after dialog closes with a delay
    setTimeout(() => {
      setTransactionSteps([]);
    }, 300);
  };

  // Context value with all utilities
  const value = {
    isProcessing,
    countryData,
    setIsProcessing,
    convertCurrency,
    handleTransaction,
    getTransactionMemo,
    formatCurrencyAmount,
    // Transaction dialog state
    setTransactionSteps,
    setCurrentOperation,
    setIsTransactionDialogOpen,
    isTransactionDialogOpen,
    isWaitingTx,
    setIsWaitingTx,
    closeTransactionDialog,
    openTransactionDialog,
    transactionSteps,
    currentOperation,
    updateStepStatus
  };
  return (
    <UtilityContext.Provider value={value}>
      {children}

      {/* Multi-step Transaction Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={(open: boolean) => !isWaitingTx && !open && closeTransactionDialog()}>
        <DialogContent className="sm:max-w-md border rounded-lg">
          <DialogHeader>
            <DialogTitle className='text-black/90 dark:text-white/90'>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              {currentOperation === 'data' ?
                `Purchasing data for ${recipient}` :
                currentOperation === 'electricity' ?
                  `Paying electricity bill for meter ${recipient}` :
                  currentOperation === 'airtime' ?
                    `Purchasing airtime for ${recipient}` :
                    'Processing transaction...'}
            </DialogDescription>
          </DialogHeader>

          {/* Transaction Steps */}
          <TransactionSteps steps={transactionSteps} />

          <DialogFooter className="flex justify-between text-black/90 dark:text-white/90">
            <Button
              variant="outline"
              onClick={closeTransactionDialog}
              disabled={isWaitingTx && !hasError}
            >
              {hasError ? 'Close' : allStepsCompleted ? 'Done' : 'Cancel'}
            </Button>
            {hasError && (
              <Button
                variant="destructive"
                onClick={() => {
                  closeTransactionDialog();
                }}
              >
                Try Again
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UtilityContext.Provider>
  );
};

// Hook to use the utility context
export const useUtility = () => {
  const context = useContext(UtilityContext);
  if (context === undefined) {
    throw new Error('useUtility must be used within a UtilityProvider');
  }
  return context;
};