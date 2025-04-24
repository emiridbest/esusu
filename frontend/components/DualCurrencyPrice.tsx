"use client";
import React, { useState, useEffect } from 'react';
import { displayDualPrice, calculateTransactionTotal } from '@/utils/currency';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface DualCurrencyPriceProps {
  amountNGN: number;
  stablecoin?: string;
  includeGasFee?: boolean;
  showTotal?: boolean;
  className?: string;
}

export default function DualCurrencyPrice({
  amountNGN,
  stablecoin = 'cUSD',
  includeGasFee = false,
  showTotal = false,
  className = ''
}: DualCurrencyPriceProps) {
  const [loading, setLoading] = useState(true);
  const [nairaDisplay, setNairaDisplay] = useState('');
  const [cryptoDisplay, setCryptoDisplay] = useState('');
  const [totalDisplay, setTotalDisplay] = useState('');
  const [gasFeeDisplay, setGasFeeDisplay] = useState('');

  useEffect(() => {
    const fetchPrices = async () => {
      setLoading(true);
      try {
        if (showTotal) {
          const { 
            nairaDisplay, 
            cryptoDisplay, 
            totalDisplay,
            gasFeeUSD
          } = await calculateTransactionTotal(amountNGN, stablecoin);
          
          setNairaDisplay(nairaDisplay);
          setCryptoDisplay(cryptoDisplay);
          setTotalDisplay(totalDisplay);
          setGasFeeDisplay(`$${gasFeeUSD.toFixed(2)}`);
        } else {
          const { 
            nairaDisplay, 
            cryptoDisplay 
          } = await displayDualPrice(amountNGN, stablecoin, includeGasFee);
          
          setNairaDisplay(nairaDisplay);
          setCryptoDisplay(cryptoDisplay);
        }
      } catch (error) {
        console.error('Error fetching price data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [amountNGN, stablecoin, includeGasFee, showTotal]);

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
          {nairaDisplay}
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