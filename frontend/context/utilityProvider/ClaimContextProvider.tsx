"use client";

import React, { useState, useContext, createContext, ReactNode } from 'react';
import { ethers, Interface } from "ethers";
import { useAccount, useSendTransaction } from "wagmi";
import { toast } from 'sonner';
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk';
import { Celo } from '@celo/rainbowkit-celo/chains';
import { usePublicClient, useWalletClient } from 'wagmi';
import { ClaimSDK, contractEnv, useIdentitySDK } from '@goodsdks/citizen-sdk';

// Constants
const RECIPIENT_WALLET = '0xb82896C4F251ed65186b416dbDb6f6192DFAF926';

// Divvi Integration 
const dataSuffix = getDataSuffix({
  consumer: RECIPIENT_WALLET,
  providers: ['0x5f0a55FaD9424ac99429f635dfb9bF20c3360Ab8', '0x6226ddE08402642964f9A6de844ea3116F0dFc7e'],
});

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

const getTokenDecimals = (token: string, tokens: any): number => {
  return tokens[token]?.decimals || 18;
};

type ClaimProcessorType = {
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  claimSDK: any;
  sendTransactionAsync: any;
  entitlement: bigint | null;
  canClaim: boolean;
  handleClaim: () => Promise<void>;
  processDataTopUp: (values: any, selectedPrice: number, availablePlans: any[], networks: any[]) => Promise<{ success: boolean; error?: any }>;
  processPayment: () => Promise<any>;
  TOKENS: typeof TOKENS;
};

type ClaimProviderProps = {
  children: ReactNode;
};

// Create the context
const ClaimProcessorContext = createContext<ClaimProcessorType | undefined>(undefined);

// Provider component - this should be a component, not a hook
export function ClaimProvider({ children }: ClaimProviderProps) {
  const sdkEnvironment  = process.env.NEXT_PUBLIC_GOODDOLLAR_ENVIRONMENT;
  if (!sdkEnvironment) {
    throw new Error("NEXT_PUBLIC_GOODDOLLAR_ENVIRONMENT is not set");
  }

  let identitySDK;
  try {
    identitySDK = useIdentitySDK(sdkEnvironment as contractEnv);
  } catch (error) {
    console.error("Error initializing IdentitySDK:", error);
    // Provide a fallback or handle the error
  }
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [entitlement, setEntitlement] = useState<bigint | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  
  
  // Initialize claimSDK
  let claimSDK = null;
  if (address && publicClient && walletClient && identitySDK) {
    try {
      claimSDK = new ClaimSDK({
        account: address,
        publicClient,
        walletClient,
        identitySDK,
        env: 'production',
      });
    } catch (error) {
      console.error("Error initializing ClaimSDK:", error);
    }
  }
  
  // Setup transaction sending
  const { sendTransactionAsync } = useSendTransaction({ chainId: Celo.id });
  
 


  const handleClaim = async () => {
    try {
      if (!claimSDK) {
        throw new Error("ClaimSDK not initialized");
      }
      
      if (entitlement !== null && entitlement <= BigInt(0)) {
        throw new Error("No entitlement available for claim.");
      }
      
      setIsProcessing(true);
      await claimSDK.claim();
      toast.success("Successfully claimed G$ tokens!");
      
      // Check entitlement again after claiming
      const newEntitlement = await claimSDK.checkEntitlement();
      setEntitlement(newEntitlement);
      setCanClaim(newEntitlement > BigInt(0));
    } catch (error) {
      console.error("Error during claim:", error);
      toast.error("There was an error processing your claim. Our team has been notified and will resolve this shortly.");
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

  const processPayment = async () => {
    if (!entitlement || entitlement <= BigInt(0)) {
      throw new Error("No entitlement available for payment.");
    }
    
    const selectedToken = "G$";
    const tokenAddress = getTokenAddress(selectedToken, TOKENS);

    const tokenAbi = ["function transfer(address to, uint256 value) returns (bool)"];
    const transferInterface = new Interface(tokenAbi);
    const transferData = transferInterface.encodeFunctionData("transfer", [
      RECIPIENT_WALLET,
      entitlement
    ]);

    const dataWithSuffix = transferData + dataSuffix;

    toast.info("Processing payment for data bundle...");
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

  // Combine all context values
  const value = {
    isProcessing,
    setIsProcessing,
    claimSDK,
    sendTransactionAsync,
    entitlement,
    canClaim,
    handleClaim,
    processDataTopUp,
    processPayment,
    TOKENS
  };

  return (
    <ClaimProcessorContext.Provider value={value}>
      {children}
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