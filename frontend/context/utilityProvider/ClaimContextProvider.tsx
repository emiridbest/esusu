"use client";

import React, { useState, useContext, createContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { Interface, formatUnits } from "ethers";
import { useAccount, useSendTransaction } from "wagmi";
import { toast } from 'sonner';
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
import { Celo } from '@celo/rainbowkit-celo/chains';
import { useIdentitySDK, useClaimSDK } from "@goodsdks/react-hooks"
import { isSupportedChain, CHAIN_DECIMALS, SupportedChains } from "@goodsdks/citizen-sdk"
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
import { txCountABI, txCountAddress } from '@/utils/pay';

// Constants
const RECIPIENT_WALLET = '0xb82896C4F251ed65186b416dbDb6f6192DFAF926';

// Token definitions
const TOKENS = {
  'G$': {
    address: '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A',
    decimals: 18
  }
};

const getTokenAddress = (token: string, tokens: any): string => {
  return tokens[token]?.address || '';
};

type ClaimProcessorType = {
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  sendTransactionAsync: any;
  entitlement: bigint | null;
  canClaim: boolean;
  handleClaim: () => Promise<{ success: boolean; error?: any }>;
  processDataTopUp: (values: any, selectedPrice: number, availablePlans: any[], networks: any[]) => Promise<{ success: boolean; error?: any }>;
  processAirtimeTopUp: (values: any, selectedPrice: number) => Promise<{ success: boolean; error?: any }>;
  processPayment: () => Promise<any>;
  TOKENS: typeof TOKENS;
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
  handleVerification: () => Promise<void>;
  isWhitelisted: boolean;
  checkingWhitelist: boolean;
  claimAmount: number | null;
  altClaimAvailable: boolean;
  altChainId: SupportedChains | null;
};

type ClaimProviderProps = {
  children: ReactNode;
};

const ClaimProcessorContext = createContext<ClaimProcessorType | undefined>(undefined);

export function ClaimProvider({ children }: ClaimProviderProps) {
  const { address, isConnected } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [entitlement, setEntitlement] = useState<bigint | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState<Step[]>([]);
  const [currentOperation, setCurrentOperation] = useState<'data' | null>(null);
  const [isWaitingTx, setIsWaitingTx] = useState(false);
  const [recipient, setRecipient] = useState<string>('');
  const { sendTransactionAsync } = useSendTransaction();
  const [claimSDK, setClaimSDK] = useState<any>(null);
  const [checkingWhitelist, setCheckingWhitelist] = useState<boolean>(true);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [claimAmount, setClaimAmount] = useState<number | null>(null);
  const [altClaimAvailable, setAltClaimAvailable] = useState(false);
  const [altChainId, setAltChainId] = useState<SupportedChains | null>(null);
  const initializationAttempted = useRef(false);
  const closeDialogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chainId = Celo.id;
  const { sdk: identitySDK } = useIdentitySDK("production");
  const { sdk: ClaimSDK, loading: claimSDKLoading, error: claimSDKError } = useClaimSDK("production");

  // Reset SDK when chain changes
  useEffect(() => {
    setClaimSDK(null);
    initializationAttempted.current = false;
  }, [chainId, claimSDKLoading]);

  // Consolidated whitelist check
  useEffect(() => {
    const checkWhitelistStatus = async () => {
      if (!identitySDK || !address) {
        setCheckingWhitelist(false);
        return;
      }

      try {
        const result = await identitySDK.getWhitelistedRoot(address);
        if (result && typeof result.isWhitelisted === 'boolean') {
          setIsWhitelisted(result.isWhitelisted);
        } else {
          setIsWhitelisted(false);
        }
      } catch (error) {
        console.error("Error checking whitelist status:", error);
        setIsWhitelisted(false);
      } finally {
        setCheckingWhitelist(false);
      }
    };

    checkWhitelistStatus();
  }, [identitySDK, address]);

  // Reset state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      initializationAttempted.current = false;
      setClaimSDK(null);
      setEntitlement(null);
      setCanClaim(false);
      setClaimAmount(null);
      setAltClaimAvailable(false);
      setAltChainId(null);
    }
  }, [isConnected]);

  // Initialize ClaimSDK - following the documentation pattern
  useEffect(() => {
    const initializeSDK = async () => {
      // Skip if prerequisites not met
      if (
        isInitializing ||
        initializationAttempted.current ||
        claimSDKLoading ||
        !ClaimSDK ||
        !chainId ||
        !isConnected ||
        !address
      ) {
        return;
      }

      setIsInitializing(true);
      initializationAttempted.current = true;

      try {
        // Validate chain is supported
        if (!isSupportedChain(chainId)) {
          throw new Error(`Unsupported chain id: ${chainId}`);
        }

        // Check entitlement - this is the correct way per documentation
        const { amount, altClaimAvailable, altChainId: altChain } = 
          await ClaimSDK.checkEntitlement();

        setEntitlement(amount);

        // Get decimals for the current chain
        const decimals = CHAIN_DECIMALS[chainId as SupportedChains];

        // Format the amount for display
        const formattedAmount = formatUnits(amount, decimals);
        const rounded = Math.round((Number(formattedAmount) + Number.EPSILON) * 100) / 100;

        setClaimAmount(rounded);
        setAltClaimAvailable(altClaimAvailable);
        setAltChainId(altClaimAvailable ? (altChain ?? null) : null);
        
        // Determine if user can claim
        setCanClaim(amount > BigInt(0));
        
        // Set the initialized SDK
        setClaimSDK(ClaimSDK);

      } catch (error) {
        console.error("Error initializing ClaimSDK:", error);
        initializationAttempted.current = false; // Allow retry on error
        setClaimAmount(null);
        setCanClaim(false);
      } finally {
        setIsInitializing(false);
      }
    };

    if (claimSDKError) {
      console.error("ClaimSDK error:", claimSDKError);
      setIsInitializing(false);
    } else if (!claimSDK && !claimSDKLoading) {
      initializeSDK();
    }
  }, [
    isConnected,
    address,
    chainId,
    ClaimSDK,
    claimSDKLoading,
    claimSDKError,
    claimSDK,
    isInitializing
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeDialogTimeoutRef.current) {
        clearTimeout(closeDialogTimeoutRef.current);
      }
    };
  }, []);

  const handleVerification = useCallback(async () => {
    if (!identitySDK) {
      return;
    }

    try {
      const currentUrl = window.location.href;
      const fvLink = await identitySDK.generateFVLink(false, currentUrl);
      window.location.href = fvLink;
    } catch (err) {
      console.error("Error generating verification link:", err);
      toast.error("Failed to generate verification link");
    }
  }, [identitySDK]);

  const updateStepStatus = useCallback((stepId: string, status: StepStatus, errorMessage?: string) => {
    setTransactionSteps(prevSteps => prevSteps.map(step =>
      step.id === stepId
        ? { ...step, status, ...(errorMessage ? { errorMessage } : {}) }
        : step
    ));
  }, []);

  const handleClaim = useCallback(async () => {
    if (!claimSDK) {
      toast.error("ClaimSDK is not initialized.");
      return { success: false, error: new Error("ClaimSDK not initialized") };
    }

    if (!isConnected) {
      return { success: false, error: new Error("Wallet not connected") };
    }

    setIsProcessing(true);

    try {
      // Optional callback example from documentation
      const claimCallback = async () => {
        console.log("Waiting for claim transaction...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log("Transaction started");
      };

      // Claim with optional callback
      const tx = await claimSDK.claim(claimCallback);
      
      if (!tx) {
        return { success: false, error: new Error("No transaction returned from claim") };
      }

      // Reset claim amount after successful claim
      setClaimAmount(null);
      setEntitlement(BigInt(0));
      setCanClaim(false);

      toast.success("Successfully claimed G$ tokens!");

      // Update transaction count with referral tracking
      const dataSuffix = getReferralTag({
        user: address as `0x${string}`,
        consumer: RECIPIENT_WALLET as `0x${string}`,
      });

      try {
        const txCountInterface = new Interface(txCountABI);
        const txCountData = txCountInterface.encodeFunctionData("increment", []);
        const dataWithSuffix = txCountData + dataSuffix;

        const txCount = await sendTransactionAsync({
          to: txCountAddress as `0x${string}`,
          data: dataWithSuffix as `0x${string}`,
        });

        try {
          await submitReferral({
            txHash: txCount as unknown as `0x${string}`,
            chainId: 42220
          });
          console.log("Referral submitted for transaction count update.");
        } catch (referralError) {
          console.error("Referral submission error:", referralError);
        }

        return { success: true };
      } catch (error) {
        console.error("Error during transaction count update:", error);
        toast.error("There was an error updating the transaction count.");
        return { success: false, error };
      }
    } catch (error) {
      console.error("Error during claim:", error);
      toast.error("There was an error processing your claim.");
      return { success: false, error };
    } finally {
      setIsProcessing(false);
    }
  }, [claimSDK, isConnected, address, sendTransactionAsync]);

  const processDataTopUp = useCallback(async (
    values: any,
    selectedPrice: number,
    availablePlans: any[],
    networks: any[]
  ) => {
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
  }, []);

  const processAirtimeTopUp = useCallback(async (values: any, selectedPrice: number) => {
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
        toast.success(`Successfully topped up ${values.phoneNumber} with ₦${selectedPrice}.`);
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
  }, []);

  const processPayment = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error("Wallet not connected");
    }
    if (!entitlement || entitlement <= BigInt(0)) {
      throw new Error("No entitlement available");
    }

    const dataSuffix = getReferralTag({
      user: address,
      consumer: RECIPIENT_WALLET as `0x${string}`,
    });

    const selectedToken = "G$";
    const tokenAddress = getTokenAddress(selectedToken, TOKENS);

    const tokenAbi = ["function transfer(address to, uint256 value) returns (bool)"];
    const transferInterface = new Interface(tokenAbi);
    const transferData = transferInterface.encodeFunctionData("transfer", [
      RECIPIENT_WALLET,
      entitlement
    ]);
    const dataWithSuffix = transferData + dataSuffix;

    try {
      const tx = await sendTransactionAsync({
        to: tokenAddress as `0x${string}`,
        data: dataWithSuffix as `0x${string}`,
      });

      try {
        await submitReferral({
          txHash: tx as unknown as `0x${string}`,
          chainId: Celo.id,
        });
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }

      toast.success("Payment transaction completed. Processing data top-up...");
      return tx;
    } catch (error) {
      console.error("Payment transaction failed:", error);
      toast.error("Payment transaction failed. Please try again.");

      const loadingStepIndex = transactionSteps.findIndex(step => step.status === 'loading');
      if (loadingStepIndex !== -1) {
        updateStepStatus(
          transactionSteps[loadingStepIndex].id,
          'error',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      throw error;
    }
  }, [isConnected, address, entitlement, sendTransactionAsync, transactionSteps, updateStepStatus]);

  const getDialogTitle = useCallback(() => {
    switch (currentOperation) {
      case 'data':
        return 'Purchase Data Bundle';
      default:
        return 'Transaction';
    }
  }, [currentOperation]);

  const openTransactionDialog = useCallback((operation: 'data', recipientValue: string) => {
    setCurrentOperation(operation);
    setRecipient(recipientValue);
    setIsTransactionDialogOpen(true);

    let steps: Step[] = [];
    if (operation === 'data') {
      steps = [
        {
          id: 'verify-phone',
          title: 'Verify Phone Number',
          description: `Verifying phone number for ${recipientValue}`,
          status: 'inactive'
        },
        {
          id: 'claim-ubi',
          title: 'Claim UBI',
          description: `Claiming Universal Basic Income`,
          status: 'inactive'
        },
        {
          id: 'top-up',
          title: 'Perform Top Up',
          description: `Confirming data purchase for ${recipientValue}`,
          status: 'inactive'
        }
      ];
    }
    setTransactionSteps(steps);
  }, []);

  const closeTransactionDialog = useCallback(() => {
    setIsTransactionDialogOpen(false);
    setCurrentOperation(null);

    if (closeDialogTimeoutRef.current) {
      clearTimeout(closeDialogTimeoutRef.current);
    }

    closeDialogTimeoutRef.current = setTimeout(() => {
      setTransactionSteps([]);
      setRecipient('');
    }, 300);
  }, []);

  const allStepsCompleted = transactionSteps.every(step => step.status === 'success');
  const hasError = transactionSteps.some(step => step.status === 'error');

  const value = {
    isProcessing,
    setIsProcessing,
    sendTransactionAsync,
    entitlement,
    canClaim,
    handleClaim,
    processDataTopUp,
    processAirtimeTopUp,
    processPayment,
    TOKENS,
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
    handleVerification,
    isWhitelisted,
    checkingWhitelist,
    claimAmount,
    altClaimAvailable,
    altChainId,
  };

  return (
    <ClaimProcessorContext.Provider value={value}>
      {children}

      <Dialog
        open={isTransactionDialogOpen}
        onOpenChange={(open) => !isWaitingTx && !open && closeTransactionDialog()}
      >
        <DialogContent className="sm:max-w-md border rounded-lg">
          <DialogHeader>
            <DialogTitle className='text-black/90 dark:text-white/90'>
              {getDialogTitle()}
            </DialogTitle>
            <DialogDescription>
              {currentOperation === 'data' && recipient && (
                `Processing data top-up for ${recipient}`
              )}
            </DialogDescription>
          </DialogHeader>

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

export function useClaimProcessor(): ClaimProcessorType {
  const context = useContext(ClaimProcessorContext);
  if (!context) {
    throw new Error("useClaimProcessor must be used within a ClaimProvider");
  }
  return context;
}