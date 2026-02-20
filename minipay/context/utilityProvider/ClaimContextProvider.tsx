"use client";

import React, { useState, useContext, createContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { encodeFunctionData, parseAbi, formatUnits } from 'viem';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { toast } from 'sonner';
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
import { celo } from 'viem/chains';
import { useIdentitySDK, useClaimSDK } from "@goodsdks/react-hooks"
import { isSupportedChain, CHAIN_DECIMALS, SupportedChains } from "@goodsdks/citizen-sdk"
import { useGasSponsorship } from '../../hooks/useGasSponsorship';
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
import { txCountABI, txCountAddress } from '../../utils/pay';

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
  setCurrentOperation: (operation: 'data' | 'airtime' | null) => void;
  isWaitingTx?: boolean;
  setIsWaitingTx?: (waiting: boolean) => void;
  closeTransactionDialog: () => void;
  openTransactionDialog: (operation: 'data' | 'airtime', recipientValue: string) => void;
  transactionSteps: Step[];
  currentOperation: "data" | "airtime" | null;
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
  const { sendTransactionAsync } = useSendTransaction();
  const [isProcessing, setIsProcessing] = useState(false);
  const [entitlement, setEntitlement] = useState<bigint | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState<Step[]>([]);
  const [currentOperation, setCurrentOperation] = useState<'data' | 'airtime' | null>(null);
  const [isWaitingTx, setIsWaitingTx] = useState(false);
  const [recipient, setRecipient] = useState<string>('');
  const [claimSDK, setClaimSDK] = useState<any>(null);
  const [checkingWhitelist, setCheckingWhitelist] = useState<boolean>(true);
  const [isWhitelisted, setIsWhitelisted] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [claimAmount, setClaimAmount] = useState<number | null>(null);
  const [altClaimAvailable, setAltClaimAvailable] = useState(false);
  const [altChainId, setAltChainId] = useState<SupportedChains | null>(null);
  const initializationAttempted = useRef(false);
  const closeDialogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chainId = celo.id;
  const { sdk: identitySDK } = useIdentitySDK("production");
  const { sdk: ClaimSDK, loading: claimSDKLoading, error: claimSDKError } = useClaimSDK("production");
  const { checkAndSponsor } = useGasSponsorship();

  // Reset SDK when chain changes
  useEffect(() => {
    setClaimSDK(null);
    initializationAttempted.current = false;
  }, [chainId]);

  // Consolidated whitelist check
  useEffect(() => {
    const checkWhitelistStatus = async () => {
      if (!identitySDK || !address) {
        setCheckingWhitelist(false);
        return;
      }

      try {
        const result = await identitySDK.getWhitelistedRoot(address as `0x${string}`);
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

  // Initialize ClaimSDK
  useEffect(() => {
    const initializeClaimSDK = async () => {
      if (!isConnected || !address || initializationAttempted.current || claimSDKLoading) {
        return;
      }

      initializationAttempted.current = true;
      setIsInitializing(true);

      try {
        if (ClaimSDK) {
          // Check entitlement - destructure the result object
          const { amount, altClaimAvailable, altChainId: altChain } =
            await ClaimSDK.checkEntitlement();

          setEntitlement(amount);
          setCanClaim(amount > BigInt(0));

          if (amount > BigInt(0)) {
            const formattedAmount = formatUnits(amount, 18);
            setClaimAmount(parseFloat(formattedAmount));
          }

          setAltClaimAvailable(altClaimAvailable);
          if (altClaimAvailable && altChain) {
            setAltChainId(altChain as SupportedChains);
          } else {
            setAltChainId(null);
          }

          // Set the initialized SDK
          setClaimSDK(ClaimSDK);
        }
      } catch (error) {
        console.error("Failed to initialize ClaimSDK:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeClaimSDK();
  }, [isConnected, address, ClaimSDK, claimSDKLoading]);

  // Handle FV (Face Verification) link generation
  const handleVerification = useCallback(async () => {
    if (!identitySDK) {
      return;
    }

    try {
      const callbackUrl = "https://farcaster.xyz/miniapps/ODGMy9CdO8UI/esusu/freebies"
      const fvLink = await identitySDK.generateFVLink(true, callbackUrl)

      const newWindow = window.open(fvLink, "_blank", "noopener,noreferrer")
      if (!newWindow) {
        window.location.href = fvLink
      } else {
        newWindow.focus()
      }

      toast.success("Verification opened in a new tab. Complete it and you'll be redirected back.")
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
    if (!isConnected || !address) {
      toast.error("Wallet not connected");
      return { success: false, error: new Error("Wallet not connected") };
    }

    setIsProcessing(true);
    setIsWaitingTx(true);

    try {
      toast.info("Claiming your UBI...");

      // Define UBI contract ABI and address
      const ubiSchemeV2Address = '0x43d72Ff17701B2DA814620735C39C620Ce0ea4A1';
      const ubiSchemeV2ABI = parseAbi([
        "function claim() returns (bool)",
      ]);

      // Prepare claim transaction using the UBI Scheme V2 contract
      const claimData = encodeFunctionData({
        abi: ubiSchemeV2ABI,
        functionName: 'claim',
        args: []
      });

      // Add Divvi referral tag to the claim transaction
      const dataSuffix = getReferralTag({
        user: address as `0x${string}`,
        consumer: RECIPIENT_WALLET as `0x${string}`,
      });

      const dataWithSuffix = claimData + dataSuffix;

      // Check and sponsor gas for claim transaction
      try {
        const sponsorshipResult = await checkAndSponsor(address as `0x${string}`, {
          contractAddress: ubiSchemeV2Address as `0x${string}`,
          abi: ubiSchemeV2ABI,
          functionName: 'claim',
          args: [],
        });

        if (sponsorshipResult.gasSponsored) {
          toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (gasError) {
        console.error("Gas sponsorship failed:", gasError);
        // Continue anyway
      }

      const tx = await sendTransactionAsync({
        to: ubiSchemeV2Address as `0x${string}`,
        data: dataWithSuffix as `0x${string}`,
      });

      if (!tx) {
        return { success: false, error: new Error("No transaction returned from claim") };
      }

      // Submit claim transaction to Divvi referral system
      try {
        await submitReferral({
          txHash: tx,
          chainId: celo.id,
        });
        console.log("Claim transaction referral submitted to Divvi.");
      } catch (referralError) {
        console.error("Referral submission error for claim:", referralError);
        // Don't fail the whole operation if referral submission fails
      }

      // Reset claim amount after successful claim
      setClaimAmount(null);
      setEntitlement(BigInt(0));
      setCanClaim(false);

      toast.success("Successfully claimed G$ tokens!");

      // Update transaction count with referral tracking
      try {
        const txCountAbi = parseAbi(["function increment()"]);
        const txCountData = encodeFunctionData({
          abi: txCountAbi,
          functionName: 'increment',
          args: []
        });

        const countDataSuffix = getReferralTag({
          user: address as `0x${string}`,
          consumer: RECIPIENT_WALLET as `0x${string}`,
        });

        const countDataWithSuffix = txCountData + countDataSuffix;

        const txHash = await sendTransactionAsync({
          to: txCountAddress as `0x${string}`,
          data: countDataWithSuffix as `0x${string}`,
        });

        try {
          await submitReferral({
            txHash: txHash,
            chainId: celo.id,
          });
          console.log("Referral submitted for transaction count update.");
        } catch (referralError) {
          console.error("Referral submission error:", referralError);
        }

        return { success: true };
      } catch (error) {
        console.error("Error during transaction count update:", error);
        // Don't fail the whole process if just the counter update fails
        // The user has already successfully claimed their UBI
        return { success: true };
      }
    } catch (error) {
      console.error("Error during claim:", error);
      toast.error("There was an error processing your claim.");
      return { success: false, error };
    } finally {
      setIsProcessing(false);
      setIsWaitingTx(false);
    }
  }, [isConnected, address, sendTransactionAsync, checkAndSponsor]);

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
        const selectedPlan = availablePlans.find(plan => parseFloat(plan.price) === selectedPrice);
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
      user: address as `0x${string}`,
      consumer: RECIPIENT_WALLET as `0x${string}`,
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

      // Check and sponsor gas
      try {
        const sponsorshipResult = await checkAndSponsor(address as `0x${string}`, {
          contractAddress: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [RECIPIENT_WALLET, entitlement],
        });

        if (sponsorshipResult.gasSponsored) {
          toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (gasError) {
        console.error("Gas sponsorship failed:", gasError);
        // Continue anyway
      }

      const txHash = await sendTransactionAsync({
        to: tokenAddress as `0x${string}`,
        data: dataWithSuffix as `0x${string}`,
      });

      try {
        await submitReferral({
          txHash: txHash,
          chainId: celo.id,
        });
      } catch (referralError) {
        console.error("Referral submission error:", referralError);
      }

      toast.success("Payment confirmed on-chain. Processing data top-up...");

      // Convert entitlement from wei to human-readable format (G$ has 18 decimals)
      const convertedAmount = formatUnits(entitlement, 18);

      return {
        transactionHash: txHash,
        convertedAmount,
        paymentToken: selectedToken
      };
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
    } finally {
      setIsWaitingTx(false);
    }
  }, [isConnected, address, entitlement, sendTransactionAsync, transactionSteps, updateStepStatus, checkAndSponsor]);

  const getDialogTitle = useCallback(() => {
    switch (currentOperation) {
      case 'data':
        return 'Purchase Data Bundle';
      case 'airtime':
        return 'Purchase Airtime';
      default:
        return 'Transaction';
    }
  }, [currentOperation]);

  const openTransactionDialog = useCallback((operation: 'data' | 'airtime', recipientValue: string) => {
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
          id: 'payment',
          title: 'Payment',
          description: 'Waiting for on-chain confirmation...',
          status: 'inactive'
        },
        {
          id: 'top-up',
          title: 'Perform Top Up',
          description: `Confirming data purchase for ${recipientValue}`,
          status: 'inactive'
        }
      ];
    } else if (operation === 'airtime') {
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
          id: 'payment',
          title: 'Payment',
          description: 'Waiting for on-chain confirmation...',
          status: 'inactive'
        },
        {
          id: 'top-up',
          title: 'Perform Top Up',
          description: `Confirming airtime purchase for ${recipientValue}`,
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
              {currentOperation === 'airtime' && recipient && (
                `Processing airtime top-up for ${recipient}`
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
