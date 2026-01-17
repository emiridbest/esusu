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
  const [celoUsdPrice, setCeloUsdPrice] = useState<number | null>(null);
  // Fetch CELO/USD price if CELO is selected
  useEffect(() => {
    async function fetchCeloPrice() {
      if (stablecoin === 'CELO') {
        try {
          // Replace with your backend or a public API endpoint for CELO/USD
          const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd');
          const data = await res.json();
          setCeloUsdPrice(data.celo.usd || 1);
        } catch {
          setCeloUsdPrice(1); // fallback to 1 if error
        }
      } else {
        setCeloUsdPrice(null);
      }
    }
    fetchCeloPrice();
  }, [stablecoin]);

  useEffect(() => {
    // Clear previous state immediately for responsiveness
    setLocalDisplay('');
    setCryptoDisplay('');
    setTotalDisplay('');
    setGasFeeDisplay('');
    setUsdEquivalent(0);
    setLoading(true);

    const fetchPrices = async () => {
      if (!amount && countryCurrency) {
        setLoading(false);
        return;
      }
      try {
        const parsedAmount = parseAmount(amount);
        setLocalDisplay(formatCurrency(parsedAmount, countryCurrency));

        // Only call convertCurrency once per update
        let usdAmount = await convertCurrency(parsedAmount.toString(), countryCurrency);

        // Stablecoins (cUSD, USDC, USDT) should always be 1:1 USD
        const stablecoins = ['CUSD', 'cUSD', 'USDC', 'USDT'];
        if (stablecoin === 'G$') {
          // GoodDollar: USD to G$ using fixed price
          const gDollarPrice = 0.0001;
          const gDollarAmount = usdAmount / gDollarPrice;
          setUsdEquivalent(gDollarAmount);
          setCryptoDisplay(`${stablecoin} ${gDollarAmount.toFixed(2)}`);
          if (showTotal) {
            setTotalDisplay(`${stablecoin} ${gDollarAmount.toFixed(2)}`);
          }
        } else if (stablecoin === 'CELO') {
          // CELO: USD to CELO using CoinGecko price
          const celoPrice = celoUsdPrice || 0.35; // default fallback price
          const celoAmount = celoPrice > 0 ? usdAmount / celoPrice : usdAmount;
          setUsdEquivalent(celoAmount);
          setCryptoDisplay(`${stablecoin} ${celoAmount.toFixed(2)}`);
          if (showTotal) {
            const gasFeeUSD = 0.01;
            const gasFeeCelo = gasFeeUSD;
            const totalWithFee = celoAmount + gasFeeCelo;
            setGasFeeDisplay(`${stablecoin} ${gasFeeCelo.toFixed(2)}`);
            setTotalDisplay(`${stablecoin} ${totalWithFee.toFixed(2)}`);
          }
        } else if (stablecoins.includes(stablecoin)) {
          // Stablecoins: 1 USD = 1 token
          setUsdEquivalent(usdAmount);
          setCryptoDisplay(`${stablecoin} ${usdAmount.toFixed(2)}`);
          if (showTotal) {
            const gasFeeUSD = 0.01;
            const totalWithFee = usdAmount + gasFeeUSD;
            setGasFeeDisplay(`${stablecoin} ${gasFeeUSD.toFixed(2)}`);
            setTotalDisplay(`${stablecoin} ${totalWithFee.toFixed(2)}`);
          }
        } else {
          // Fallback: treat as 1:1 USD
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
        console.error('Error fetching price data:', error);
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
  }, [amount, stablecoin, includeGasFee, showTotal, convertCurrency, countryCurrency, celoUsdPrice]);

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