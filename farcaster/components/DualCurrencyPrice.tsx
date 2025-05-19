"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '../components/ui/skeleton';
import { useUtility } from '../context/utilityProvider/UtilityContext';
import { formatCurrency, parseAmount } from '../utils/currency';

interface DualCurrencyPriceProps {
  amount: number | string;
  stablecoin?: string;
  includeGasFee?: boolean;
  showTotal?: boolean;
  className?: string;
}

export default function DualCurrencyPrice({
  amount,
  stablecoin = 'cUSD',
  includeGasFee = false,
  showTotal = false,
  className = ''
}: DualCurrencyPriceProps) {
  const { countryData, convertCurrency } = useUtility();
  const [loading, setLoading] = useState(true);
  const [localDisplay, setLocalDisplay] = useState('');
  const [cryptoDisplay, setCryptoDisplay] = useState('');
  const [totalDisplay, setTotalDisplay] = useState('');
  const [gasFeeDisplay, setGasFeeDisplay] = useState('');
  const [usdEquivalent, setUsdEquivalent] = useState(0);

  useEffect(() => {
    const fetchPrices = async () => {
      if (!amount) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const parsedAmount = parseAmount(amount);
        const currencyCode = countryData?.currency.code || 'NGN';
        
        // Format the local currency amount
        setLocalDisplay(formatCurrency(parsedAmount, currencyCode));
        
        // Convert local currency to USD
        let usdAmount;
        try {
          usdAmount = await convertCurrency(
            parsedAmount.toString(), 
            currencyCode, 
            'USD'
          );
          setUsdEquivalent(usdAmount);
        } catch (error) {
          console.error('Error converting to USD:', error);
          setUsdEquivalent(0);
          throw error;
        }
        
        setCryptoDisplay(`${stablecoin} ${usdAmount.toFixed(2)}`);
        
        if (showTotal) {
          // Standard gas fee in USD
          const gasFeeUSD = 0.01;
          const totalWithFee = usdAmount + gasFeeUSD;
          
          setGasFeeDisplay(`${stablecoin} ${gasFeeUSD.toFixed(2)}`);
          setTotalDisplay(`${stablecoin} ${totalWithFee.toFixed(2)}`);
        }
      } catch (error) {
        console.error('Error fetching price data:', error);
        setLocalDisplay(formatCurrency(parseAmount(amount), countryData?.currency.code || 'NGN'));
        setCryptoDisplay(`${stablecoin} 0.00`);
        
        if (showTotal) {
          setGasFeeDisplay(`${stablecoin} 0.01`);
          setTotalDisplay(`${stablecoin} 0.01`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [amount, stablecoin, includeGasFee, showTotal, countryData, convertCurrency]);

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
        {showTotal && <Skeleton className="h-5 w-28" />}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-1"
      >
        <div className="text-base font-medium dark:text-white">
          {localDisplay}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          ≈ {cryptoDisplay}
        </div>
        
        {showTotal && (
          <>
            <div className="text-xs text-gray-500 pt-1">
              Gas Fee: {gasFeeDisplay}
            </div>
            <div className="text-sm font-medium text-primary pt-1">
              Total: {totalDisplay}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}