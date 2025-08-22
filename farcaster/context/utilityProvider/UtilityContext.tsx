"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { ethers, Interface, isAddress } from "ethers";
import {
  useAccount,
  useWriteContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";
import { config } from '../../components/providers/WagmiProvider';
import { getReferralTag, submitReferral } from '@divvi/referral-sdk';
import { CountryData } from '../../utils/countryData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { TransactionSteps, Step, StepStatus } from '../../components/TransactionSteps';
import { Mento } from "@mento-protocol/mento-sdk";
import Celo from '@celo/rainbowkit-celo/chains/celo';

// Constants
const RECIPIENT_WALLET = '0xb82896C4F251ed65186b416dbDb6f6192DFAF926' as const;

const TOKEN_ADDRESSES = {
  USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  USDT: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  CUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  CELO: "0x471EcE3750Da237f93B8E339c536989b8978a438",
  'G$': "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A", // Add actual G$ address
} as const;

const TOKEN_DECIMALS = {
  USDC: 6,
  USDT: 6,
  CUSD: 18,
  CELO: 18,
  'G$': 18,
} as const;

const TOKEN_MULTIPLIERS = {
  'G$': BigInt(10000),
  CELO: BigInt(28), // 2.8x multiplier = 28/10
} as const;

// Error Classes
class TransactionError extends Error {
  constructor(
    message: string,
    public code: 'INSUFFICIENT_FUNDS' | 'NETWORK_ERROR' | 'USER_REJECTED' | 'INVALID_INPUT' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

// Type Definitions
type UtilityType = 'data' | 'electricity' | 'airtime';

type UtilityContextType = {
  isProcessing: boolean;
  countryData: CountryData | null;
  setCountryData: (data: CountryData | null) => void;
  setIsProcessing: (processing: boolean) => void;
  convertCurrency: (amount: string, base_currency: string) => Promise<number>;
  handleTransaction: (params: TransactionParams) => Promise<`0x${string}` | undefined>;
  getTransactionMemo: (type: UtilityType, metadata: Record<string, any>) => string;
  formatCurrencyAmount: (amount: string | number) => string;
  mento: Mento | null;
  // Transaction dialog
  isTransactionDialogOpen: boolean;
  setIsTransactionDialogOpen: (open: boolean) => void;
  setTransactionSteps: (steps: Step[]) => void;
  setCurrentOperation: (operation: UtilityType | null) => void;
  isWaitingTx: boolean;
  setIsWaitingTx: (waiting: boolean) => void;
  closeTransactionDialog: () => void;
  openTransactionDialog: (operation: UtilityType, recipientValue: string) => void;
  transactionSteps: Step[];
  currentOperation: UtilityType | null;
  updateStepStatus: (stepId: string, status: StepStatus, errorMessage?: string) => void;
  currentTxHash: `0x${string}` | undefined;
};

type TransactionParams = {
  type: UtilityType;
  amount: string;
  token: keyof typeof TOKEN_ADDRESSES;
  recipient: string;
  metadata: Record<string, any>;
};

type UtilityProviderProps = {
  children: ReactNode;
};

// Utility Functions
const isHexString = (value: string): value is `0x${string}` => {
  return /^0x[0-9a-fA-F]*$/.test(value);
};

const validateAddress = (address: string): boolean => {
  return isAddress(address);
};

const getSafeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
      return 'Insufficient funds in wallet';
    }
    if (message.includes('user rejected') || message.includes('user denied')) {
      return 'Transaction cancelled by user';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'Network error. Please check your connection';
    }
    if (message.includes('nonce')) {
      return 'Transaction conflict. Please try again';
    }
  }
  return 'Transaction failed. Please try again';
};

// Create the context
const UtilityContext = createContext<UtilityContextType | undefined>(undefined);

// Provider component
export const UtilityProvider = ({ children }: UtilityProviderProps) => {
  // State Management
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState<Step[]>([]);
  const [currentOperation, setCurrentOperation] = useState<UtilityType | null>(null);
  const [isWaitingTx, setIsWaitingTx] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [recipient, setRecipient] = useState<string>('');
  const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | undefined>();
  const [mento, setMento] = useState<Mento | null>(null);
  const [pendingTransactionData, setPendingTransactionData] = useState<TransactionParams | null>(null);

  // Hooks
  const { address, chain, isConnected } = useAccount();
  const celoChainId = config.chains[0].id;

  // Memoized provider
  const provider = useMemo(
    () => new ethers.JsonRpcProvider("https://forno.celo.org"),
    []
  );

  const {
    switchChain,
  } = useSwitchChain();

  const {
    writeContractAsync,
    data: writeData,
    isPending: isWritePending,
    isSuccess: isWriteSuccess,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();

  // Wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash: writeData,
  });


  // Initialize Mento SDK
  useEffect(() => {
    if (!isConnected || mento) return;

    const initMento = async () => {
      try {
        const mentoInstance = await Mento.create(provider);
        setMento(mentoInstance);
      } catch (error) {
        console.error('Failed to initialize Mento:', error);
        toast.error('Failed to initialize exchange service');
      }
    };

    initMento();
  }, [isConnected, provider, mento]);

  // Handle transaction submission success
  useEffect(() => {
    if (isWriteSuccess && writeData) {
      setCurrentTxHash(writeData);
      updateStepStatus('send-payment', 'success');
      updateStepStatus('top-up', 'loading');

      // Submit referral if we have pending transaction data
      if (pendingTransactionData && address) {
        submitReferral({
          txHash: writeData,
          chainId: Celo.id
        }).catch(error => {
          console.warn('Failed to submit referral:', error);
        });
      }
    }
  }, [isWriteSuccess, writeData, pendingTransactionData, address]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && writeData) {
      updateStepStatus('top-up', 'success');
      toast.success('Transaction confirmed!');

      // Show success message based on operation type
      if (pendingTransactionData) {
        const successMessages: Record<UtilityType, string> = {
          data: `Successfully purchased data for ${pendingTransactionData.recipient}`,
          electricity: `Successfully paid electricity bill for meter ${pendingTransactionData.recipient}`,
          airtime: `Successfully purchased airtime for ${pendingTransactionData.recipient}`,
        };
        toast.success(successMessages[pendingTransactionData.type]);
      }

      // Clean up
      setTimeout(() => {
        setPendingTransactionData(null);
        setCurrentTxHash(undefined);
        resetWrite();
      }, 2000);
    }
  }, [isConfirmed, writeData, pendingTransactionData, resetWrite]);

  // Handle write error
  useEffect(() => {
    if (writeError) {
      const errorMessage = getSafeErrorMessage(writeError);
      const loadingStep = transactionSteps.find(step => step.status === 'loading');
      if (loadingStep) {
        updateStepStatus(loadingStep.id, 'error', errorMessage);
      }
      toast.error(errorMessage);
      setIsWaitingTx(false);
      setIsProcessing(false);
    }
  }, [writeError, transactionSteps]);

  // Handle confirmation error
  useEffect(() => {
    if (confirmError) {
      updateStepStatus('top-up', 'error', getSafeErrorMessage(confirmError));
      toast.error('Transaction failed to confirm');
      setIsWaitingTx(false);
      setIsProcessing(false);
    }
  }, [confirmError]);

  // Currency conversion with retry logic
  const convertCurrency = useCallback(async (
    amount: string,
    base_currency: string
  ): Promise<number> => {
    // Validate input
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new TransactionError('Invalid amount for currency conversion', 'INVALID_INPUT');
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch('/api/exchange-rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount.toString(),
            base_currency,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to convert currency');
        }

        const data = await response.json();
        const convertedAmount = parseFloat(data.toAmount);

        if (isNaN(convertedAmount) || convertedAmount <= 0) {
          throw new Error('Invalid conversion result');
        }

        return convertedAmount;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    console.error('Currency conversion failed after retries:', lastError);
    throw new TransactionError('Failed to convert currency after multiple attempts', 'NETWORK_ERROR');
  }, []);

  // Handle chain switching
  const handleSwitchChain = useCallback(async (): Promise<boolean> => {
    try {
      await switchChain({ chainId: celoChainId });

      // Wait for chain to actually change (with timeout)
      const timeout = 10000; // 10 seconds
      const startTime = Date.now();

      while (chain?.id !== celoChainId) {
        if (Date.now() - startTime > timeout) {
          throw new Error('Chain switch timeout');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast.success('Successfully switched to Celo network');
      return true;
    } catch (error) {
      console.error('Failed to switch chain:', error);
      toast.error('Failed to switch to Celo network. Please switch manually.');
      return false;
    }
  }, [switchChain, celoChainId, chain?.id]);

  // Update step status
  const updateStepStatus = useCallback((
    stepId: string,
    status: StepStatus,
    errorMessage?: string
  ) => {
    setTransactionSteps(prevSteps => prevSteps.map(step =>
      step.id === stepId
        ? { ...step, status, ...(errorMessage ? { errorMessage: getSafeErrorMessage(errorMessage) } : {}) }
        : step
    ));
  }, []);

  // Format currency amount
  const formatCurrencyAmount = useCallback((amount: string | number): string => {
    if (!countryData) return `${amount}`;

    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numericAmount)) return `${countryData.currency?.symbol || '₦'}0`;

    const formattedNumber = numericAmount.toLocaleString('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });

    return `${countryData.currency?.symbol || '₦'}${formattedNumber}`;
  }, [countryData]);

  // Generate transaction memo
  const getTransactionMemo = useCallback((
    type: UtilityType,
    metadata: Record<string, any>
  ): string => {
    const memoMap: Record<UtilityType, string> = {
      data: `Data purchase for ${metadata.phone || 'unknown'} - ${metadata.dataBundle || 'unknown'} bundle`,
      electricity: `Electricity payment for meter ${metadata.meterNumber || 'unknown'} - ${metadata.meterType || 'unknown'}`,
      airtime: `Airtime purchase for ${metadata.phone || 'unknown'} - ${metadata.amount || 'unknown'} ${metadata.currency || ''}`,
    };

    return memoMap[type] || 'Utility payment';
  }, []);

  // Main transaction handler
  const handleTransaction = useCallback(async ({
    type,
    amount,
    token,
    recipient,
    metadata
  }: TransactionParams): Promise<`0x${string}` | undefined> => {
    // Store transaction data for later use
    setPendingTransactionData({ type, amount, token, recipient, metadata });

    // Check chain
    if (chain?.id !== celoChainId) {
      const switched = await handleSwitchChain();
      if (!switched) {
        return undefined;
      }
    }

    // Validate inputs
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid amount');
      return undefined;
    }

    if (!validateAddress(RECIPIENT_WALLET)) {
      throw new TransactionError('Invalid recipient address', 'INVALID_INPUT');
    }

    setIsProcessing(true);
    setIsWaitingTx(true);

    try {
      // Step 1: Convert currency
      updateStepStatus('check-balance', 'loading');

      const currencyCode = metadata?.countryCode || countryData?.currency?.code;
      if (!currencyCode) {
        throw new TransactionError('Currency code not found', 'INVALID_INPUT');
      }

      const convertedAmount = await convertCurrency(amount, currencyCode);

      if (convertedAmount <= 0) {
        throw new TransactionError('Invalid conversion result', 'INVALID_INPUT');
      }

      updateStepStatus('check-balance', 'success');

      // Step 2: Prepare transaction
      updateStepStatus('send-payment', 'loading');

      const tokenAddress = TOKEN_ADDRESSES[token];
      const decimals = TOKEN_DECIMALS[token];

      if (!tokenAddress) {
        throw new TransactionError(`Unsupported token: ${token}`, 'INVALID_INPUT');
      }

      // Parse amount with correct decimals
      let paymentAmount = ethers.parseUnits(convertedAmount.toFixed(decimals), decimals);

      // Apply token-specific multipliers
      if (token === 'G$' && TOKEN_MULTIPLIERS['G$']) {
        paymentAmount = paymentAmount * TOKEN_MULTIPLIERS['G$'];
      } else if (token === 'CELO' && TOKEN_MULTIPLIERS.CELO) {
        // 2.8x multiplier = 28/10
        paymentAmount = (paymentAmount * TOKEN_MULTIPLIERS.CELO) / BigInt(10);
      }
      // Prepare transfer data
      const tokenAbi = [
        {
          type: "function",
          name: "transfer",
          stateMutability: "nonpayable",
          inputs: [
            { name: "to", type: "address" },
            { name: "value", type: "uint256" }
          ],
          outputs: [
            { name: "", type: "bool" }
          ]
        }
      ] as const;
      const transferInterface = new Interface(tokenAbi);
      const transferData = transferInterface.encodeFunctionData("transfer", [
        RECIPIENT_WALLET,
        paymentAmount
      ]);

      // Add referral tag if address is available
      let dataWithSuffix = transferData;
      if (address) {
        try {
          const dataSuffix = getReferralTag({
            user: address,
            consumer: RECIPIENT_WALLET,
          });
          // Ensure proper hex concatenation
          if (dataSuffix && dataSuffix.startsWith('0x')) {
            // Remove '0x' prefix from suffix before concatenating
            dataWithSuffix = transferData + dataSuffix.slice(2);
          } else if (dataSuffix) {
            dataWithSuffix = transferData + dataSuffix;
          }
        } catch (error) {
          console.warn('Failed to add referral tag:', error);
          // Continue without referral tag if it fails
        }
      }

      if (!isHexString(dataWithSuffix)) {
        console.error('Invalid transaction data format:', dataWithSuffix);
        // Fall back to transfer without referral tag
        dataWithSuffix = transferData;
      }

      // Execute the transaction with encoded data
      const txHash = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: tokenAbi,
        functionName: 'transfer',
        args: [RECIPIENT_WALLET, paymentAmount],
        chain: chain, // Pass the current chain object
        account: address, // Pass the current user's address
      });


      return undefined;
    } catch (error) {
      console.error('Transaction failed:', error);

      // Update error status if not already handled
      if (!writeError) {
        const loadingStep = transactionSteps.find(step => step.status === 'loading');
        if (loadingStep) {
          updateStepStatus(loadingStep.id, 'error', getSafeErrorMessage(error));
        }
        toast.error(getSafeErrorMessage(error));
      }

      setIsWaitingTx(false);
      setIsProcessing(false);
      return undefined;
    }
  }, [
    chain?.id,
    celoChainId,
    handleSwitchChain,
    countryData,
    convertCurrency,
    writeContractAsync,
    transactionSteps,
    updateStepStatus,
    writeError,
    address
  ]);

  // Open transaction dialog
  const openTransactionDialog = useCallback((
    operation: UtilityType,
    recipientValue: string
  ) => {
    // Reset write state when opening new transaction
    resetWrite();
    setPendingTransactionData(null);

    setCurrentOperation(operation);
    setRecipient(recipientValue);
    setIsTransactionDialogOpen(true);

    const stepConfigs: Record<UtilityType, Step[]> = {
      data: [
        {
          id: 'verify-phone',
          title: 'Verify Phone Number',
          description: `Verifying phone number ${recipientValue}`,
          status: 'inactive'
        },
        {
          id: 'check-balance',
          title: 'Check Balance',
          description: 'Checking wallet balance',
          status: 'inactive'
        },
        {
          id: 'send-payment',
          title: 'Send Payment',
          description: `Processing payment`,
          status: 'inactive'
        },
        {
          id: 'top-up',
          title: 'Complete Purchase',
          description: `Confirming data purchase`,
          status: 'inactive'
        }
      ],
      electricity: [
        {
          id: 'verify-meter',
          title: 'Verify Meter',
          description: `Verifying meter ${recipientValue}`,
          status: 'inactive'
        },
        {
          id: 'check-balance',
          title: 'Check Balance',
          description: 'Checking wallet balance',
          status: 'inactive'
        },
        {
          id: 'send-payment',
          title: 'Send Payment',
          description: `Processing payment`,
          status: 'inactive'
        },
        {
          id: 'top-up',
          title: 'Complete Payment',
          description: `Confirming electricity payment`,
          status: 'inactive'
        }
      ],
      airtime: [
        {
          id: 'verify-phone',
          title: 'Verify Phone Number',
          description: `Verifying phone number ${recipientValue}`,
          status: 'inactive'
        },
        {
          id: 'check-balance',
          title: 'Check Balance',
          description: 'Checking wallet balance',
          status: 'inactive'
        },
        {
          id: 'send-payment',
          title: 'Send Payment',
          description: `Processing payment`,
          status: 'inactive'
        },
        {
          id: 'top-up',
          title: 'Complete Purchase',
          description: `Confirming airtime purchase`,
          status: 'inactive'
        }
      ],
    };

    setTransactionSteps(stepConfigs[operation] || []);
  }, [resetWrite]);

  // Close transaction dialog
  const closeTransactionDialog = useCallback(() => {
    setIsTransactionDialogOpen(false);
    setCurrentOperation(null);
    setCurrentTxHash(undefined);
    setIsWaitingTx(false);
    setIsProcessing(false);
    setPendingTransactionData(null);

    // Reset steps after animation
    setTimeout(() => {
      setTransactionSteps([]);
      setRecipient('');
      resetWrite();
    }, 300);
  }, [resetWrite]);

  // Get dialog title
  const getDialogTitle = (): string => {
    const titles: Record<UtilityType, string> = {
      data: 'Purchase Data Bundle',
      electricity: 'Pay Electricity Bill',
      airtime: 'Purchase Airtime',
    };
    return currentOperation ? titles[currentOperation] : 'Transaction';
  };

  // Get dialog description
  const getDialogDescription = (): string => {
    const descriptions: Record<UtilityType, string> = {
      data: `Purchasing data for ${recipient}`,
      electricity: `Paying electricity bill for meter ${recipient}`,
      airtime: `Purchasing airtime for ${recipient}`,
    };
    return currentOperation ? descriptions[currentOperation] : 'Processing transaction...';
  };

  // Check dialog states
  const allStepsCompleted = transactionSteps.every(step => step.status === 'success');
  const hasError = transactionSteps.some(step => step.status === 'error');
  const isTransactionPending = isWaitingTx || isConfirming || isWritePending;

  // Context value
  const value = useMemo<UtilityContextType>(() => ({
    isProcessing,
    countryData,
    setCountryData,
    setIsProcessing,
    convertCurrency,
    handleTransaction,
    getTransactionMemo,
    formatCurrencyAmount,
    mento,
    // Transaction dialog
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
    updateStepStatus,
    currentTxHash: writeData,
  }), [
    isProcessing,
    countryData,
    convertCurrency,
    handleTransaction,
    getTransactionMemo,
    formatCurrencyAmount,
    mento,
    isTransactionDialogOpen,
    isWaitingTx,
    closeTransactionDialog,
    openTransactionDialog,
    transactionSteps,
    currentOperation,
    updateStepStatus,
    writeData,
  ]);

  return (
    <UtilityContext.Provider value={value}>
      {children}

      {/* Multi-step Transaction Dialog */}
      <Dialog
        open={isTransactionDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isTransactionPending) {
            closeTransactionDialog();
          }
        }}
      >
        <DialogContent className="sm:max-w-md border rounded-lg">
          <DialogHeader>
            <DialogTitle className='text-black/90 dark:text-white/90'>
              {getDialogTitle()}
            </DialogTitle>
            <DialogDescription>
              {getDialogDescription()}
            </DialogDescription>
          </DialogHeader>

          {/* Transaction Steps */}
          <TransactionSteps steps={transactionSteps} />

          <DialogFooter className="flex justify-between text-black/90 dark:text-white/90">
            <Button
              variant="outline"
              onClick={closeTransactionDialog}
              disabled={isTransactionPending}
            >
              {hasError ? 'Close' : allStepsCompleted ? 'Done' : 'Cancel'}
            </Button>

            {hasError && (
              <Button
                variant="destructive"
                onClick={() => {
                  // Reset error states and retry
                  setTransactionSteps(prevSteps =>
                    prevSteps.map(step => ({
                      ...step,
                      status: 'inactive',
                      errorMessage: undefined
                    }))
                  );
                  resetWrite();
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