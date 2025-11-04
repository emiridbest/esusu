"use client";

import React, { useState, useContext, createContext, ReactNode, useMemo, useEffect, useRef } from 'react';
import { encodeFunctionData, parseAbi } from 'viem';
import { useActiveAccount, useActiveWallet } from "thirdweb/react";
import { toast } from 'sonner';
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
import { celo } from 'wagmi/chains';
import { createPublicClient, http, webSocket, fallback } from 'viem'
import { IdentitySDK, ClaimSDK } from "@goodsdks/citizen-sdk"

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
import { createWalletClient, custom } from 'viem'
// import { celo } from 'viem/chains'
import { PublicClient, WalletClient } from "viem"
import { txCountABI, txCountAddress } from '@/utils/pay';
// Removed wagmi writeContract - using Thirdweb v5 instead
import { ethers } from 'ethers';
// Constants
const RECIPIENT_WALLET = '0xb82896C4F251ed65186b416dbDb6f6192DFAF926';



// Token definitions
const TOKENS = {
  'G$': {
    address: '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A', // G$ token address on Celo
    decimals: 18
  }
};

// Helper functions for token handling
const getTokenAddress = (token: string, tokens: any): string => {
  return tokens[token]?.address || '';
};


type ClaimProcessorType = {
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  // Removed sendTransactionAsync - using Thirdweb v5 directly
  entitlement: bigint | null;
  canClaim: boolean;
  handleClaim: () => Promise<void>;
  processDataTopUp: (values: any, selectedPrice: number, availablePlans: any[], networks: any[]) => Promise<{ success: boolean; error?: any }>;
  processAirtimeTopUp: (values: any, selectedPrice: number) => Promise<{ success: boolean; error?: any }>;
  processPayment: () => Promise<any>;
  TOKENS: typeof TOKENS;
  // Transaction dialog
  isTransactionDialogOpen: boolean;
  setIsTransactionDialogOpen: (open: boolean) => void;
  setTransactionSteps: (steps: Step[]) => void;
  setCurrentOperation: (operation: 'data' | null) => void;
  isWaitingTx?: boolean;
  setIsWaitingTx?: (waiting: boolean) => void;
  closeTransactionDialog: () => void;
  openTransactionDialog: (operation: 'data', recipientValue: string) => void;
  transactionSteps: Step[];
  currentOperation: "data" | null;
  updateStepStatus: (stepId: string, status: StepStatus, errorMessage?: string) => void;

};

type ClaimProviderProps = {
  children: ReactNode;
};

// Create the context
const ClaimProcessorContext = createContext<ClaimProcessorType | undefined>(undefined);

// Provider component - this should be a component, not a hook
export function ClaimProvider({ children }: ClaimProviderProps) {

  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const address = account?.address;
  const isConnected = !!address;
  const [isProcessing, setIsProcessing] = useState(false);
  const [entitlement, setEntitlement] = useState<bigint | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState<Step[]>([]);
  const [currentOperation, setCurrentOperation] = useState<'data' | null>(null);
  const [isWaitingTx, setIsWaitingTx] = useState(false);
  const [recipient, setRecipient] = useState<string>('');
  // Using Thirdweb v5 sendTransaction instead of wagmi
  const [claimSDK, setClaimSDK] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const initializationAttempted = useRef(false);


  const publicClient = createPublicClient({
    chain: celo,
    transport: http('https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8', {
      timeout: 30_000,
      retryCount: 3,
    })
  })
  const walletClient = useMemo(() => {
    if (isConnected && window.ethereum && address) {
      return createWalletClient({
        account: address as `0x${string}`,
        chain: celo,
        transport: custom(window.ethereum)
      });
    }
    return null;
  }, [isConnected, address]);

  const identitySDK = useMemo(() => {
    if (isConnected && publicClient && walletClient) {
      try {
        return new IdentitySDK({
          publicClient: publicClient as PublicClient,
          walletClient: walletClient as WalletClient,
          env: "production"
        });
      } catch (error) {
        console.error("Failed to initialize IdentitySDK:", error);
        return null;
      }
    }
    return null;
  }, [publicClient, walletClient, isConnected]);

  useEffect(() => {
    const initializeClaimSDK = async () => {
      // Skip if we're already initializing, already initialized, or missing prerequisites
      if (
        isInitializing ||
        initializationAttempted.current ||
        claimSDK ||
        !isConnected ||
        !walletClient ||
        !identitySDK ||
        !address
      ) {
        return;
      }

      try {
        setIsInitializing(true);
        initializationAttempted.current = true;


        const sdk = ClaimSDK.init({
          publicClient: publicClient as PublicClient,
          walletClient: walletClient as unknown as WalletClient,
          identitySDK,
          env: 'production',
        });


        const initializedSDK = await sdk;
        setClaimSDK(initializedSDK);

        // Check initial entitlement
        if (initializedSDK) {
          const entitlementValue = await initializedSDK.checkEntitlement();
          setEntitlement(entitlementValue);
          setCanClaim(entitlementValue > BigInt(0));
        }
      } catch (error) {
        console.error("Error initializing ClaimSDK:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeClaimSDK();
  }, [isConnected, walletClient, identitySDK, address, publicClient, claimSDK, isInitializing]);

  // Reset initialization state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      initializationAttempted.current = false;
      setClaimSDK(null);
    }
  }, [isConnected]);



  // Update step status helper function
  const updateStepStatus = (stepId: string, status: StepStatus, errorMessage?: string) => {
    setTransactionSteps(prevSteps => prevSteps.map(step =>
      step.id === stepId
        ? { ...step, status, ...(errorMessage ? { errorMessage } : {}) }
        : step
    ));
  };

  const handleClaim = async () => {
    try {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }

      if (!claimSDK) {
        throw new Error("ClaimSDK not initialized");
      }

      toast.info("Processing claim for G$ tokens...");
      setIsProcessing(true);
      setIsWaitingTx(true);
      updateStepStatus('claim-ubi', 'loading');
      // Check entitlement again after claiming
      const newEntitlement = await claimSDK.checkEntitlement();
      setEntitlement(newEntitlement);
      const tx = await claimSDK.claim();
      if (!tx) {
        return;
      }
      toast.success("Successfully claimed G$ tokens!");
      updateStepStatus('claim-ubi', 'success');
      
      const dataSuffix = getReferralTag({
        user: address as `0x${string}`,
        consumer: '0xb82896C4F251ed65186b416dbDb6f6192DFAF926',
      });
      
      try {
        const txCountInterface = new ethers.Interface(txCountABI);
        const txCountData = txCountInterface.encodeFunctionData("increment", []);
        const dataWithSuffix = txCountData + dataSuffix;

        if (!wallet || !account) throw new Error('Wallet not connected');
        
        const { sendTransaction, prepareTransaction } = await import('thirdweb');
        const { client, activeChain } = await import('@/lib/thirdweb');
        
        const transaction = await prepareTransaction({
          to: txCountAddress as `0x${string}`,
          data: dataWithSuffix as `0x${string}`,
          client,
          chain: activeChain,
        });
        const txCount = await sendTransaction({
          account,
          transaction,
        });
        
        try {
          await submitReferral({
            txHash: txCount.transactionHash,
            chainId: activeChain.id,
          });
          console.log("Referral submitted for transaction count update.");
        } catch (referralError) {
          console.error("Referral submission error:", referralError);
        }
      } catch (error) {
        console.error("Error during transaction count update:", error);
        toast.error("There was an error updating the transaction count.");
      }
    } catch (error) {
      console.error("Error during claim:", error);
      toast.error("There was an error processing your claim.");
      updateStepStatus('claim-ubi', 'error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
      setIsWaitingTx(false);
    }
  };

  const processDataTopUp = async (values: any, selectedPrice: number, availablePlans: any[], networks: any[]) => {
    if (!values || !values.phoneNumber || !values.country || !values.network) {
      toast.error("Please ensure all required fields are filled out.");
      return { success: false };
    }

    try {
      const cleanPhoneNumber = values.phoneNumber.replace(/[\s\-\+]/g, '');

      const response = await fetch('/api/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operatorId: values.network,
          amount: selectedPrice.toString(),
          customId: values.customId,
          transactionHash: values.transactionHash,
          expectedAmount: values.expectedAmount,
          paymentToken: values.paymentToken,
          serviceType: 'data',
          recipientPhone: {
            country: values.country,
            phoneNumber: cleanPhoneNumber
          },
          email: values.email,
          isFreeClaim: true
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const selectedPlan = availablePlans[0];
        toast.success(`Successfully topped up ${values.phoneNumber} with ${selectedPlan?.name || 'your selected plan'}.`);
        return { success: true };
      } else {
        console.error("Top-up API Error:", data);
        toast.error(data.error || "There was an issue processing your top-up. Our team has been notified.");
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Error during top-up:", error);
      toast.error("There was an error processing your top-up. Our team has been notified and will resolve this shortly.");
      return { success: false, error };
    }
  };

  const processAirtimeTopUp = async (values: any, selectedPrice: number) => {
    if (!values || !values.phoneNumber || !values.country || !values.network) {
      toast.error("Please ensure all required fields are filled out.");
      return { success: false };
    }

    try {
      const cleanPhoneNumber = values.phoneNumber.replace(/[\s\-\+]/g, '');

      const response = await fetch('/api/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operatorId: values.network,
          amount: selectedPrice.toString(),
          customId: values.customId,
          transactionHash: values.transactionHash,
          expectedAmount: values.expectedAmount,
          paymentToken: values.paymentToken,
          serviceType: 'airtime',
          recipientPhone: {
            country: values.country,
            phoneNumber: cleanPhoneNumber
          },
          email: values.email,
          isFreeClaim: true
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Successfully topped up ${values.phoneNumber} with airtime.`);
        return { success: true };
      } else {
        console.error("Top-up API Error:", data);
        toast.error(data.error || "There was an issue processing your top-up. Our team has been notified.");
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Error during top-up:", error);
      toast.error("There was an error processing your top-up. Our team has been notified and will resolve this shortly.");
      return { success: false, error };
    }
  };

  const processPayment = async () => {
    if (!isConnected || !address) {
      return;
    }
    if (!entitlement || entitlement <= BigInt(0)) {
      toast.info("No entitlement available at the moment.");
      return;
    }

    const dataSuffix = getReferralTag({
      user: address as `0x${string}`,
      consumer: '0xb82896C4F251ed65186b416dbDb6f6192DFAF926',
    });
    const selectedToken = "G$";
    const tokenAddress = getTokenAddress(selectedToken, TOKENS);

    const erc20Abi = parseAbi(["function transfer(address to, uint256 value) returns (bool)"]);
    const transferData = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [RECIPIENT_WALLET as `0x${string}`, entitlement as bigint]
    });
    console.log("Processing payment for address:", address);

    const dataWithSuffix = transferData + dataSuffix;

    toast.info("Processing payment for data bundle...");
    try {
      setIsWaitingTx(true);
      if (!wallet || !account) throw new Error('Wallet not connected');
      
      const { sendTransaction, prepareTransaction } = await import('thirdweb');
      const { client, activeChain } = await import('@/lib/thirdweb');
      
      const transaction = await prepareTransaction({
        to: tokenAddress as `0x${string}`,
        data: dataWithSuffix as `0x${string}`,
        client,
        chain: activeChain,
      });
      const tx = await sendTransaction({
        account,
        transaction,
      });
      // Wait for on-chain confirmation before proceeding to top-up
      const { waitForReceipt } = await import('thirdweb');
      const receipt = await waitForReceipt({
        client,
        chain: activeChain,
        transactionHash: tx.transactionHash,
      });
      try {
        await submitReferral({
          txHash: tx.transactionHash,
          chainId: celo.id,
        });
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }

      toast.success("Payment confirmed on-chain. Processing data top-up...");
      
      // Convert entitlement from wei to human-readable format (G$ has 18 decimals)
      const { formatUnits } = await import('viem');
      const convertedAmount = formatUnits(entitlement, 18);
      
      return {
        transactionHash: tx.transactionHash,
        convertedAmount,
        paymentToken: selectedToken
      };
    } catch (error) {
      console.error("Payment transaction failed:", error);
      toast.error("Payment transaction failed. Please try again.");
      // Find the current loading step and mark it as error
      const loadingStepIndex = transactionSteps.findIndex(step => step.status === 'loading');
      if (loadingStepIndex !== -1) {
        updateStepStatus(
          transactionSteps[loadingStepIndex].id,
          'error',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      throw error;

    } finally {
      setIsWaitingTx(false);
    }
  };


  // Get dialog title based on current operation
  const getDialogTitle = () => {
    switch (currentOperation) {
      case 'data':
        return 'Purchase Data Bundle';
      default:
        return 'Transaction';
    }
  };

  const openTransactionDialog = (operation: 'data', recipientValue: string) => {
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
          id: 'claim-ubi',
          title: 'Claim UBI',
          description: `Claiming Universal Basic Income for ${recipient}`,
          status: 'inactive'
        },
        {
          id: 'payment',
          title: 'Payment',
          description: 'Waiting for on-chain confirmation...',
          status: 'inactive'
        },
        {
          id: 'top-up',
          title: 'Perform Top Up',
          description: `Confirming data purchase for ${recipient}`,
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


  // Combine all context values
  const value = {
    isProcessing,
    setIsProcessing,
    // Removed sendTransactionAsync - using Thirdweb v5 directly
    entitlement,
    canClaim,
    handleClaim,
    processDataTopUp,
    processAirtimeTopUp,
    processPayment,
    TOKENS,
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
    <ClaimProcessorContext.Provider value={value}>
      {children}
      {/* Multi-step Transaction Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={(open: any) => !isWaitingTx && !open && closeTransactionDialog()}>
        <DialogContent className="sm:max-w-md border rounded-lg">
          <DialogHeader>
            <DialogTitle className='text-black/90 dark:text-white/90'>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              {currentOperation === 'data'}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClaimProcessorContext.Provider>
  );
}

// Hook to use the claim processor context
export function useClaimProcessor(): ClaimProcessorType {
  const context = useContext(ClaimProcessorContext);
  if (!context) {
    throw new Error("useClaimProcessor must be used within a ClaimProvider");
  }
  return context;
}