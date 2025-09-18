"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '../ui/skeleton';
import { useUtility } from '@/context/utilityProvider/UtilityContext';
import { getCountryData } from '@/utils/countryData';

interface DualCurrencyPriceProps {
  amount: number | string;
  countryCurrency?: string;
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
export function formatCurrency(amount: number, currency: string): string {
  if (isNaN(amount)) return '0.00';
  const currencyCode = getCountryData(currency)?.currency?.code;
  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  });

  return formatter.format(amount);
}

export default function DualCurrencyPrice({
  amount,
  stablecoin = '',
  countryCurrency = '',
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
  const [usdEquivalent, setUsdEquivalent] = useState(0);

  useEffect(() => {
    const fetchPrices = async () => {
      if (!amount && countryCurrency) {
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
          // Convert local currency amount to USD
          console.log('Converting amount:', parsedAmount, 'from currency:', countryCurrency);
          usdAmount = await convertCurrency(parsedAmount.toString(), countryCurrency);
          console.log('Converted USD amount:', usdAmount);
          if (stablecoin === 'G$') {
            const gDollarAmount = usdAmount / 0.0001;
            setUsdEquivalent(gDollarAmount);
            setCryptoDisplay(`${stablecoin} ${gDollarAmount.toFixed(2)}`);
            if (showTotal) {
              const totalWithFee = gDollarAmount ;
              setTotalDisplay(`${stablecoin} ${totalWithFee.toFixed(2)}`);
            }
          }
          else if (stablecoin === 'CELO') {
            usdAmount = await convertCurrency(parsedAmount.toString(), countryCurrency);
            setUsdEquivalent(usdAmount * 2.8);
            setCryptoDisplay(`${stablecoin} ${(usdAmount * 2.8).toFixed(2)}`);
            if (showTotal) {
              const totalWithFee = usdAmount * 2.8 ;
              setTotalDisplay(`${stablecoin} ${totalWithFee.toFixed(2)}`);
            }
          }
          else {
            usdAmount = await convertCurrency(parseAmount(amount).toString(), countryCurrency);
            setUsdEquivalent(usdAmount);
            setCryptoDisplay(`${stablecoin} ${usdAmount.toFixed(2)}`);
            if (showTotal) {
              const gasFeeUSD = 0.01;
              const totalWithFee = usdAmount + gasFeeUSD;
              setGasFeeDisplay(`${stablecoin} ${gasFeeUSD.toFixed(2)}`);
              setTotalDisplay(`${stablecoin} ${totalWithFee.toFixed(2)}`);
            }
          }
        } catch (error) {
          console.error('Error converting to USD:', error);
          setUsdEquivalent(0);
          throw error;
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
        <div className="text-base font-medium dark:text-black/70">
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
            <div className="text-sm font-medium text-black/70 pt-1">
              Total: {totalDisplay}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}