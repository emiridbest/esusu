"use client";

import React, { useState, useContext, createContext, ReactNode, useMemo, useEffect, useRef, useCallback } from 'react';
import { ethers, Interface } from "ethers";
import { useAccount, useChainId, useConnect, useSendTransaction, useSwitchChain } from "wagmi";
import { toast } from 'sonner';
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
import { Celo } from '@celo/rainbowkit-celo/chains';
import { IdentitySDK, ClaimSDK } from "@goodsdks/citizen-sdk"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { celo } from 'viem/chains'
import { createPublicClient, http } from 'viem'
import { Button } from "../../components/ui/button";
import { TransactionSteps, Step, StepStatus } from '../../components/TransactionSteps';
import { txCountABI, txCountAddress } from '../../utils/pay';
import { config } from '../../components/providers/WagmiProvider';
import { PublicClient, WalletClient } from "viem"
import { createWalletClient, custom } from 'viem'
const RECIPIENT_WALLET = '0xb82896C4F251ed65186b416dbDb6f6192DFAF926';

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
  claimSDK: any;
  celoChainId: number;
  sendTransactionAsync: any;
  entitlement: bigint | null;
  canClaim: boolean;
  isSwitchChainPending: boolean;
  isSwitchChainError: boolean;
  switchChainError: Error | null;
  handleSwitchChain: () => void;
  handleClaim: () => Promise<{ success: boolean; error?: any }>;
  processDataTopUp: (values: any, selectedPrice: number, availablePlans: any[], networks: any[]) => Promise<{ success: boolean; error?: any }>;
  processAirtimeTopUp: (values: any, selectedPrice: number) => Promise<{ success: boolean; error?: any }>;
  processPayment: () => Promise<string>;
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
  const celoChainId = config.chains[0].id;
  const [claimSDK, setClaimSDK] = useState<any>(null);
  const [checkingWhitelist, setCheckingWhitelist] = useState<boolean>(true);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean>(false);
  const initializationAttempted = useRef(false);

  const { connect, connectors } = useConnect();
  const { sendTransactionAsync } = useSendTransaction({ config });

  const {
    switchChain,
    error: switchChainError,
    isError: isSwitchChainError,
    isPending: isSwitchChainPending,
  } = useSwitchChain();

  const chainId = useChainId();

  const handleSwitchChain = useCallback(() => {
    switchChain({ chainId: celoChainId });
  }, [switchChain, celoChainId]);

  const publicClient = createPublicClient({
    chain: celo,
    transport: http()
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
        return new IdentitySDK(
          publicClient as unknown as PublicClient,
          walletClient as unknown as WalletClient,
          "production"
        );
      } catch (error) {
        console.error("Failed to initialize IdentitySDK:", error);
        return null;
      }
    }
    return null;
  }, [publicClient, walletClient, isConnected]);
  useEffect(() => {
    const switchToCelo = async () => {
      if (!isConnected || (isConnected && chainId !== celoChainId)) {
        try {
          handleSwitchChain();
          await new Promise(resolve => setTimeout(resolve, 3000));
          if (chainId === celoChainId) {
            const connector = connectors.find((c) => c.id === "miniAppConnector") || connectors[1];
            connect({
              connector,
              chainId: celoChainId,
            });
            toast.success("Connected to Celo network successfully!");
          } else {
            throw new Error("Failed to switch to Celo network");
          }
        } catch (error) {
          console.error("Connection error:", error);
        }
      }
    };

    switchToCelo();
  }, [connect, connectors, chainId, celoChainId, handleSwitchChain, isConnected]);

  // Reset initialization state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      handleSwitchChain();
      initializationAttempted.current = false;
      setClaimSDK(null);
    }
  }, [isConnected, handleSwitchChain]);

  const handleVerification = async () => {
    if (!identitySDK ) {
      toast.error("Identity SDK not initialized");
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
  };

  // Check whitelist status
  useEffect(() => {
    const checkWhitelistStatus = async () => {
      if (!identitySDK || !address ) {
        setCheckingWhitelist(false);
        return;
      }

      try {
        const { isWhitelisted } = await identitySDK.getWhitelistedRoot(address);
        setIsWhitelisted(isWhitelisted);
      } catch (error) {
        console.error("Error checking whitelist status:", error);
        setIsWhitelisted(false);
      } finally {
        setCheckingWhitelist(false);
      }
    };

    checkWhitelistStatus();
  }, [identitySDK, address]);

  const updateStepStatus = (stepId: string, status: StepStatus, errorMessage?: string) => {
    setTransactionSteps(prevSteps => prevSteps.map(step =>
      step.id === stepId
        ? { ...step, status, ...(errorMessage ? { errorMessage } : {}) }
        : step
    ));
  };

  const handleClaim = async () => {
    handleSwitchChain();
    try {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }

      if (!claimSDK) {
        throw new Error("ClaimSDK not initialized");
      }

      setIsProcessing(true);
      const newEntitlement = await claimSDK.checkEntitlement();
      setEntitlement(newEntitlement);
      const tx = await claimSDK.claim();

      if (!tx) {
        return { success: false, error: new Error("No transaction returned from claim") };
      }

      toast.success("Successfully claimed G$ tokens!");

      const dataSuffix = getReferralTag({
        user: address as `0x${string}`,
        consumer: '0xb82896C4F251ed65186b416dbDb6f6192DFAF926',
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
        toast.success(`Successfully topped up ${values.phoneNumber} with N100.`);
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
    if (!entitlement || entitlement <= BigInt(0)) {
      throw new Error("No entitlement available for payment.");
    }

    const dataSuffix = getReferralTag({
      user: address as `0x${string}`,
      consumer: '0xb82896C4F251ed65186b416dbDb6f6192DFAF926',
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
      throw error;
    }
  };

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

    let steps: Step[] = [];
    if (operation === 'data') {
      steps = [
        {
          id: 'verify-phone-number',
          title: 'Verify Phone Number',
          description: `Verifying phone number for ${recipientValue}`,
          status: 'inactive'
        },
        {
          id: 'claim-ubi',
          title: 'Claim UBI',
          description: `Claiming Universal Basic Income for ${recipientValue}`,
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
  };

  const allStepsCompleted = transactionSteps.every(step => step.status === 'success');
  const hasError = transactionSteps.some(step => step.status === 'error');

  const closeTransactionDialog = () => {
    setIsTransactionDialogOpen(false);
    setCurrentOperation(null);
    setTimeout(() => {
      setTransactionSteps([]);
    }, 300);
  };

  const value = {
    isProcessing,
    setIsProcessing,
    claimSDK,
    celoChainId,
    sendTransactionAsync,
    entitlement,
    canClaim,
    isSwitchChainPending,
    isSwitchChainError,
    switchChainError,
    handleSwitchChain,
    handleClaim,
    processDataTopUp,
    processAirtimeTopUp,
    processPayment,
    TOKENS,
    setTransactionSteps,
    setCurrentOperation,
    setIsTransactionDialogOpen,
    isTransactionDialogOpen,
    isWaitingTx: false,
    setIsWaitingTx,
    closeTransactionDialog,
    openTransactionDialog,
    transactionSteps,
    currentOperation,
    updateStepStatus,
    handleVerification,
    isWhitelisted,
    checkingWhitelist
  };

  return (
    <ClaimProcessorContext.Provider value={value}>
      {children}
      <Dialog open={isTransactionDialogOpen} onOpenChange={(open) => !isWaitingTx && !open && closeTransactionDialog()}>
        <DialogContent className="sm:max-w-md border rounded-lg">
          <DialogHeader>
            <DialogTitle className='text-black/90 dark:text-white/90'>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              {currentOperation === 'data' ? `Purchasing data for ${recipient}` : 'Processing transaction...'}
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