"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { toast } from 'react-toastify';
import { BrowserProvider, Contract, ethers, formatUnits, Interface, parseEther } from "ethers";
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk'
import { BigNumber } from 'alchemy-sdk';
import { Celo } from '@celo/rainbowkit-celo/chains';
import { getCountryData, CountryData } from '../../utils/countryData';

// The recipient wallet address for all utility payments
const RECIPIENT_WALLET = '0xb82896C4F251ed65186b416dbDb6f6192DFAF926';

// Divvi Integration - retain as requested
const dataSuffix = getDataSuffix({
  consumer: RECIPIENT_WALLET,
  providers: ['0x5f0a55FaD9424ac99429f635dfb9bF20c3360Ab8', '0x6226ddE08402642964f9A6de844ea3116F0dFc7e'],
})

// Enhanced Type definitions
type UtilityContextType = {
  isProcessing: boolean;
  selectedToken: string;
  selectedCountry: string | null;
  countryData: CountryData | null;
  setSelectedToken: (token: string) => void;
  setSelectedCountry: (countryCode: string) => void;
  handleTokenChange: (value: string) => void;
  setIsProcessing: (processing: boolean) => void;
  convertCurrency: (amount: string, fromCurrency?: string, toCurrency?: string) => Promise<number>;
  handleTransaction: (params: TransactionParams) => Promise<boolean>;
  approveSpend: (amount: string, token: string) => Promise<boolean>;
  // New metadata types for different utility payments
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
  const [selectedToken, setSelectedToken] = useState<string>('CUSD');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [amount, setAmount] = useState<string>('');

  // Update country data when country selection changes
  useEffect(() => {
    if (selectedCountry) {
      const data = getCountryData(selectedCountry);
      setCountryData(data || null);
    } else {
      setCountryData(null);
    }
  }, [selectedCountry]);

  // Function to convert currency using the Reloadly FX API
  const convertCurrency = async (
    amount: string, 
    fromCurrency?: string, 
    toCurrency: string = 'USD'
  ): Promise<number> => {
    try {
      // Use the selected country's currency code if fromCurrency is not provided
      const sourceCurrency = fromCurrency || (countryData?.currency.code || 'NGN');
      
      // Ensure amount is valid
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
          base_currency: sourceCurrency,
          quote_currency: toCurrency,
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

  const handleTokenChange = (value: string) => {
    setSelectedToken(value);
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
        return 18; // CUSD uses 18 decimals
      case 'USDC':
      case 'USDT':
        return 6; // USDC and USDT typically use 6 decimals
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
    
    return `${countryData.currency.symbol}${formattedNumber}`;
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

  const approveSpend = async (amount: string, selectedToken: string): Promise<boolean> => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return false;
    }
    
    setIsApproving(true);
    
    if (window.ethereum) {
      try {
        let accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        let userAddress = accounts[0];
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(userAddress);
        
        // Parse amount using the correct decimal places for the token
        const decimals = getTokenDecimals(selectedToken);
        const depositValue = ethers.parseUnits(amount, decimals);
        const gasLimit = 600000; // Set a reasonable gas limit

        const tokenAddress = getTokenAddress(selectedToken);
        const tokenAbi = [
          "function allowance(address owner, address spender) view returns (uint256)",
          "function approve(address spender, uint256 amount) returns (bool)"
        ];

        const tokenContract = new Contract(tokenAddress, tokenAbi, signer);
        const allowance = await tokenContract.allowance(userAddress, RECIPIENT_WALLET);
        
        // Convert to BigNumber for comparison
        const allowanceBigNumber = BigNumber.from(allowance.toString());

        if (allowanceBigNumber.gte(depositValue.toString())) {
          setIsApproved(true);
          toast.success('Already approved!');
          return true;
        } else {
          toast.info('Approving transaction...');

          // Correctly encode the approve function with parameters
          const approveInterface = new Interface(tokenAbi);
          const approveData = approveInterface.encodeFunctionData("approve", [
            RECIPIENT_WALLET,
            depositValue
          ]);

          // Append the data suffix to the approve call data for Divvi integration
          const dataWithSuffix = approveData + dataSuffix;

          // Send the transaction with the properly encoded data
          const tx = await signer.sendTransaction({
            to: tokenAddress,
            data: dataWithSuffix,
            gasLimit: gasLimit
          });

          // Wait for the transaction to be confirmed
          await tx.wait();

          try {
            // Submit the referral data to Divvi
            await submitReferral({
              txHash: tx.hash as `0x${string}`,
              chainId: Celo.id 
            });

            setIsApproved(true);
            toast.success('Approval successful!');
            return true;
          } catch (referralError) {
            console.error("Error submitting referral:", referralError);
            // Still set approved since the transaction succeeded
            setIsApproved(true);
            toast.success('Approval successful, but referral tracking failed');
            return true;
          }
        }
      } catch (error) {
        console.error("Error approving spend:", error);
        toast.error('Approval failed!');
        return false;
      } finally {
        setIsApproving(false);
      }
    } else {
      toast.error('Ethereum provider not found. Please install a Web3 wallet.');
      return false;
    }
  };

  // Enhanced transaction handler for all utility types
  const handleTransaction = async ({ type, amount, token, recipient, metadata }: TransactionParams): Promise<boolean> => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return false;
    }

    setIsProcessing(true);

    try {
      // Convert the local currency amount to its equivalent in USD
      const convertedAmount = await convertCurrency(amount, countryData?.currency.code, 'USD');
      if (convertedAmount <= 0) {
        toast.error('Currency conversion failed. Please try again.');
        return false;
      }

      // First approve token spending if needed
      const approved = await approveSpend(convertedAmount.toString(), token);
      if (!approved) {
        toast.error('Transaction cannot proceed without approval');
        return false;
      }

      // Get the token contract interface
      const tokenAddress = getTokenAddress(token);
      const decimals = getTokenDecimals(token);

      if (window.ethereum) {
        // Set up provider and signer
        let accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        let userAddress = accounts[0];
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(userAddress);

        // Prepare transaction memo based on utility type
        const memo = getTransactionMemo(type, metadata);

        // Parse amount with correct decimals
        const paymentAmount = ethers.parseUnits(convertedAmount.toString(), decimals);

        // Prepare token transfer
        const tokenAbi = ["function transfer(address to, uint256 value) returns (bool)"];
        const tokenContract = new Contract(tokenAddress, tokenAbi, signer);

        // Encode the transfer function
        const transferInterface = new Interface(tokenAbi);
        const transferData = transferInterface.encodeFunctionData("transfer", [
          RECIPIENT_WALLET,
          paymentAmount
        ]);

        // Append the Divvi data suffix
        const dataWithSuffix = transferData + dataSuffix;

        // Send the transaction
        const tx = await signer.sendTransaction({
          to: tokenAddress,
          data: dataWithSuffix,
          gasLimit: 600000
        });

        // Wait for transaction confirmation
        await tx.wait();

        // Submit the referral to Divvi
        try {
          await submitReferral({
            txHash: tx.hash as `0x${string}`,
            chainId: Celo.id 
          });
        } catch (referralError) {
          console.error("Referral submission error:", referralError);
          // Continue since the main transaction succeeded
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
    selectedToken,
    selectedCountry,
    countryData,
    setSelectedToken,
    setSelectedCountry,
    handleTokenChange,
    setIsProcessing,
    convertCurrency,
    handleTransaction,
    approveSpend,
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