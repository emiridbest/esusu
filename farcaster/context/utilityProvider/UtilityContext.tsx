"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, use, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ethers, Interface } from "ethers";
import {
  useAccount,
  useSendTransaction,
  useSwitchChain,
} from "wagmi";
import { config } from '../../components/providers/WagmiProvider';
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk'
import {  CountryData } from '../../utils/countryData';

// The recipient wallet address for all utility payments
const RECIPIENT_WALLET = '0xb82896C4F251ed65186b416dbDb6f6192DFAF926';

// Divvi Integration 
const dataSuffix = getDataSuffix({
  consumer: RECIPIENT_WALLET,
  providers: ['0x5f0a55FaD9424ac99429f635dfb9bF20c3360Ab8', '0x6226ddE08402642964f9A6de844ea3116F0dFc7e'],
})


type UtilityContextType = {
  isProcessing: boolean;
  countryData: CountryData | null;
  setIsProcessing: (processing: boolean) => void;
  convertCurrency: (amount: string, fromCurrency?: string, toCurrency?: string) => Promise<number>;
  handleTransaction: (params: TransactionParams) => Promise<boolean>;
  getTransactionMemo: (type: 'data' | 'electricity' | 'cable', metadata: Record<string, any>) => string;
  formatCurrencyAmount: (amount: string | number) => string;
};

type TransactionParams = {
  type: 'data' | 'electricity' | 'cable';
  amount: string;
  token: string;
  recipient: string;
  metadata: Record<string, any>;
};

type UtilityProviderProps = {
  children: ReactNode;
};

// Create the context
const UtilityContext = createContext<UtilityContextType | undefined>(undefined);

// Provider component
export const UtilityProvider = ({ children }: UtilityProviderProps) => {
  const usdcAddress = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
  const cusdAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  const usdtAddress = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const { address, chain } = useAccount();
 const celoChainId = config.chains[0].id;
  const {
    switchChain,
    error: switchChainError,
    isError: isSwitchChainError,
    isPending: isSwitchChainPending,
  } = useSwitchChain();
  
  
  const handleSwitchChain = useCallback(() => {
    switchChain({ chainId: celoChainId });
  }, [switchChain, celoChainId]);

  const { 
    sendTransactionAsync
  } = useSendTransaction({ config })


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
  const getTransactionMemo = (type: 'data' | 'electricity' | 'cable', metadata: Record<string, any>): string => {
    switch (type) {
      case 'data':
        return `Data purchase for ${metadata.phone || 'unknown'} - ${metadata.dataBundle || 'unknown'} bundle`;
      case 'electricity':
        return `Electricity payment for meter ${metadata.meterNumber || 'unknown'} - ${metadata.meterType || 'unknown'}`;
      case 'cable':
        return `Cable TV subscription for ${metadata.decoderNumber || 'unknown'} - ${metadata.planName || 'unknown'}`;
      default:
        return 'Utility payment';
    }
  };

  // Enhanced transaction handler for all utility types
  const handleTransaction = async ({ type, amount, token, recipient, metadata }: TransactionParams): Promise<boolean> => {
    console.log("Handling transaction:", chain.id);
    if (chain?.id !== celoChainId) {
      if (isSwitchChainPending) {
        toast.info('Switching to Celo network...');
      }
      if (isSwitchChainError) {
        toast.error(`Failed to switch chain: ${switchChainError?.message || 'Unknown error'}`);
      } else {
        await handleSwitchChain();
      }
      return false;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return false;
    }
    setIsProcessing(true);
      try {
      console.log("metatadata", metadata);
      // Convert the local currency amount to its equivalent in USD
      const currencyCode = metadata?.countryCode || countryData?.currency?.code;
      const convertedAmount = await convertCurrency(amount, currencyCode);

      if (convertedAmount <= 0) {
        toast.error('Currency conversion failed. Please try again.');
        return false;
      }
     

      // Get the token contract interface
      const tokenAddress = getTokenAddress(token);
      const decimals = getTokenDecimals(token);

      if (address) {
        // Prepare transaction memo based on utility type
        const memo = getTransactionMemo(type, metadata);

        // Parse amount with correct decimals
        const paymentAmount = ethers.parseUnits(convertedAmount.toString(), decimals);

        // Prepare token transfer
        const tokenAbi = ["function transfer(address to, uint256 value) returns (bool)"];

        // Encode the transfer function
        const transferInterface = new Interface(tokenAbi);
        const transferData = transferInterface.encodeFunctionData("transfer", [
          RECIPIENT_WALLET,
          paymentAmount
        ]);

        // Append the Divvi data suffix
        const dataWithSuffix = transferData + dataSuffix;
        // Send the transaction
        const tx = await sendTransactionAsync({
          to: tokenAddress,
          data: dataWithSuffix,
          gasLimit: 600000
        });


        // Submit the referral to Divvi
        try {
          await submitReferral({
            txHash: tx as unknown as `0x${string}`,
            chainId: celoChainId 
          });
          console.log("Referral submitted successfully");
        } catch (referralError) {
          console.error("Referral submission error:", referralError);
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
          case 'cable':
            successMessage = `Successfully subscribed for ${metadata.planName || 'TV service'} on ${recipient}`;
            break;
        }
        toast.success(successMessage);
        return true;
      } else {
        toast.error('Ethereum provider not found. Please install a Web3 wallet.');
        return false;
      }
    } catch (error) {
      console.error('Transaction failed:', error);
      toast.error('Transaction failed. Please try again.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Context value with all utilities
  const value = {
    isProcessing,
    countryData,
    setIsProcessing,
    convertCurrency,
    handleTransaction,
    getTransactionMemo,
    formatCurrencyAmount
  };

  return (
    <UtilityContext.Provider value={value}>
      {children}
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