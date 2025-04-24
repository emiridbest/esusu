"use client";

import React, { createContext, useContext, useState,  ReactNode } from 'react';
import { toast } from 'react-toastify';

// Type definitions
type UtilityContextType = {
  isProcessing: boolean;
  selectedToken: string;
  setSelectedToken: (token: string) => void;
  setIsProcessing: (processing: boolean) => void;
  convertCurrency: (amount: string, fromToken: string, toToken: string) => Promise<number>;
  handleTransaction: (params: TransactionParams) => Promise<boolean>;
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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedToken, setSelectedToken] = useState<string>('cusd');

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

  // Function to handle all transactions
  const handleTransaction = async ({ type, amount, token, recipient, metadata }: TransactionParams): Promise<boolean> => {

    setIsProcessing(true);
    
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
    setIsProcessing,
    convertCurrency,
    handleTransaction
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