"use client";

import React, { createContext, useContext, useState,  ReactNode } from 'react';
import { toast } from 'react-toastify';
import { BrowserProvider, Contract, ethers, formatUnits, Interface, parseEther } from "ethers";
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk'
import { BigNumber } from 'alchemy-sdk';
import { Celo } from '@celo/rainbowkit-celo/chains';
import { contractAddress, abi } from '../../utils/abi';



//Divvi Integration
const dataSuffix = getDataSuffix({
  consumer: '0xb82896C4F251ed65186b416dbDb6f6192DFAF926',
  providers: ['0x5f0a55FaD9424ac99429f635dfb9bF20c3360Ab8', '0x6226ddE08402642964f9A6de844ea3116F0dFc7e'],
})

// Type definitions
type UtilityContextType = {
  isProcessing: boolean;
  selectedToken: string;
  setSelectedToken: (token: string) => void;
  handleTokenChange: (value: string) => void;
  setIsProcessing: (processing: boolean) => void;
  convertCurrency: (amount: string, fromToken: string, toToken: string) => Promise<number>;
  handleTransaction: (params: TransactionParams) => Promise<boolean>;
  approveSpend: (amount: string, token: string) => Promise<boolean>;
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
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [amount, setAmount] = useState<string>('');

  // Function to convert currency using the API
  const convertCurrency = async (amount: string, fromToken: string ="NGN", toToken: string): Promise<number> => {
    try {
      const response = await fetch('/api/exchange_rate/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          base_currency: fromToken,
          quote_currency:
          toToken,
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert currency');
      }
      
      return parseFloat(data.toAmount);
    } catch (error) {
      console.error('Currency conversion error:', error);
      toast.error('Failed to convert currency');
      return 0;
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
        return usdcAddress;
    }
  };
  const approveSpend = async (amount: string, selectedToken: string): Promise<boolean> => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setIsApproving(true);
    if (window.ethereum) {
      try {
        let accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        let userAddress = accounts[0];
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(userAddress);
        const depositValue = parseEther(amount.toString());
        const gasLimit = parseInt("600000");
        const tokenAddress = getTokenAddress(selectedToken);
        const tokenAbi = [
          "function allowance(address owner, address spender) view returns (uint256)",
          "function approve(address spender, uint256 amount) returns (bool)"
        ];
        const tokenContract = new Contract(tokenAddress, tokenAbi, signer);
        const allowance = await tokenContract.allowance(userAddress, contractAddress);
        const allowanceBigNumber = BigNumber.from(allowance);

        if (allowanceBigNumber.gte(depositValue)) {
          setIsApproved(true);
          toast.success('Already approved!');
        } else {
          toast.info('Approving transaction...');

          // Correctly encode the approve function with parameters
          const approveInterface = new Interface(tokenAbi);
          const approveData = approveInterface.encodeFunctionData("approve", [
            contractAddress,
            depositValue
          ]);

          // Append the data suffix to the approve call data
          const dataWithSuffix = approveData + dataSuffix;

          // Send the transaction with the properly encoded data
          const tx = await signer.sendTransaction({
            to: tokenAddress,
            data: dataWithSuffix,
            gasLimit: gasLimit
          });

          await tx.wait();

          try {
            await submitReferral({
              txHash: tx.hash as `0x${string}`,
              chainId: Celo.id 
            });

            setIsApproved(true);
            toast.success('Approval successful!');
          } catch (referralError) {
            console.error("Error submitting referral:", referralError);
            // Still set approved since the transaction succeeded
            setIsApproved(true);
            toast.success('Approval successful, but referral tracking failed');
          }
        }
      } catch (error) {
        console.error("Error approving spend:", error);
        toast.error('Approval failed!');
      } finally {
        setIsApproving(false);
      }
    }
  };

  // Function to handle all transactions
  const handleTransaction = async ({ type, amount, token, recipient, metadata }: TransactionParams): Promise<boolean> => {

    setIsProcessing(true);
    await approveSpend(amount, token);
    try {
      // send value of ethers to address

      let successMessage = '';
      switch (type) {
        case 'data':
          successMessage = `Successfully purchased data for ${recipient}`;
          break;
        case 'electricity':
          successMessage = `Successfully paid electricity bill for meter ${recipient}`;
          break;
        case 'cable':
          successMessage = `Successfully subscribed for ${metadata.planName} on ${recipient}`;
          break;
      }
      
      toast.success(successMessage);
      return true;
    } catch (error) {
      console.error('Transaction failed:', error);
      toast.error('Transaction failed. Please try again.');
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // Context value
  const value = {
    isProcessing,
    selectedToken,
    setSelectedToken,
    handleTokenChange,
    setIsProcessing,
    convertCurrency,
    handleTransaction,
    approveSpend
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