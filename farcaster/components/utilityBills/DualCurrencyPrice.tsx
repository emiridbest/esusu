"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '../ui/skeleton';
import { useUtility } from '../../context/utilityProvider/UtilityContext';
import { useCountryCurrencyData } from './MobileDataForm';
import { useCountryCurrencyElectricity } from './ElectricityBillForm';
import { useCountryCurrencyCable } from './CableTVForm';
interface DualCurrencyPriceProps {
  amount: number | string;
  stablecoin?: string;
  includeGasFee?: boolean;
  showTotal?: boolean;
  className?: string;
}

export function parseAmount(amount: string | number): number {
  if (typeof amount === 'string') {
    const cleanAmount = amount.replace(/[₦$,]/g, '').trim();
    return parseFloat(cleanAmount) || 0;
  }
  return amount || 0;
}
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  if (isNaN(amount)) return '0.00';

  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency === 'NGN' ? 'NGN' : 'USD',
    minimumFractionDigits: 2,
  });

  return formatter.format(amount);
}

export default function DualCurrencyPrice({
  amount,
  stablecoin = 'cUSD',
  includeGasFee = false,
  showTotal = false,
  className = ''
}: DualCurrencyPriceProps) {
  const { convertCurrency } = useUtility();



  const [loading, setLoading] = useState(true);
  const [localDisplay, setLocalDisplay] = useState('');
  const [cryptoDisplay, setCryptoDisplay] = useState('');
  const [totalDisplay, setTotalDisplay] = useState('');
  const [gasFeeDisplay, setGasFeeDisplay] = useState('');
   const dataContext = useCountryCurrencyData();
   const electricityContext = useCountryCurrencyElectricity();
   const cableContext = useCountryCurrencyCable();

  // Use the context and provide a fallback if not available
  let countryCurrency = "";
  if (dataContext) {
    countryCurrency = dataContext.countryCurrency;
  } else if (electricityContext) {
    countryCurrency = electricityContext.countryCurrency;
  } else if (cableContext) {
    countryCurrency = cableContext.countryCurrency;
  }


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

        // Format the local currency amount
        setLocalDisplay(formatCurrency(parsedAmount, countryCurrency));

        // Convert local currency to USD
        let usdAmount;
        try {
          usdAmount = await convertCurrency(parseAmount(amount).toString(), countryCurrency);
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

        // Use the countryCurrency already fetched at component level
        setLocalDisplay(formatCurrency(parseAmount(amount), countryCurrency));
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

  }, [amount, stablecoin, includeGasFee, showTotal, convertCurrency, countryCurrency]);

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