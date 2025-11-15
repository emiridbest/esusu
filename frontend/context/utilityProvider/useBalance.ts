"use client";
import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import { getContract, readContract } from 'thirdweb';
import { client, activeChain } from '@/lib/thirdweb';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { celo } from 'wagmi/chains';

const TOKEN_ADDRESSES = {
  CUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
  CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438', // Native CELO token
  G$: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A", // G$ token address
};

// Define token decimals
const tokenDecimals: Record<string, number> = {
  CELO: 18,
  cUSD: 18,
  cEUR: 18,
  USDC: 6,
  USDT: 6,
  'G$': 18,
};

export const useBalance = () => {
  // Cache token prices (CELO/USD, G$/USD)
  const [celoUsdPrice, setCeloUsdPrice] = useState<number>(2.8); // fallback to 2.8
  const [goodDollarUsdPrice, setGoodDollarUsdPrice] = useState<number>(0.0001); // fallback to 0.0001

  // Fetch token prices once per session (or on demand)
  useEffect(() => {
    async function fetchPrices() {
      try {
        const celoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd');
        const celoData = await celoRes.json();
        if (celoData.celo && celoData.celo.usd) setCeloUsdPrice(celoData.celo.usd);
        const gdRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=gooddollar&vs_currencies=usd');
        const gdData = await gdRes.json();
        if (gdData.gooddollar && gdData.gooddollar.usd) setGoodDollarUsdPrice(gdData.gooddollar.usd);
      } catch (err) {
        // fallback to defaults
      }
    }
    fetchPrices();
  }, []);
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  
  const address = account?.address;

  const getTokenDecimals = (token: string): number => {
    return tokenDecimals[token] || 18;
  };

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

  const getTokenAddress = (tokenId: string): string => {
    const address = TOKEN_ADDRESSES[tokenId as keyof typeof TOKEN_ADDRESSES];
    if (!address) {
      throw new Error(`Unknown token: ${tokenId}`);
    }
    return address;
  };

  const checkTokenBalance = async (
    amount: string,
    tokenId: string,
    currencyCode: string
  ): Promise<boolean> => {
    if (!address || !wallet) {
      toast.error('Wallet not connected');
      return false;
    }

    try {
      const tokenAddress = getTokenAddress(tokenId);
      const decimals = getTokenDecimals(tokenId);
      console.log(`Checking balance for ${tokenId} (${tokenAddress})`);

      const convertedAmount = await convertCurrency(amount, currencyCode);
      let requiredAmount = ethers.parseUnits(convertedAmount.toString(), decimals);

      // Apply token-specific conversion using cached rates
      if (tokenId === 'G$') {
        // Convert USD to G$ using cached rate
        const gDollarAmount = Number(convertedAmount) / goodDollarUsdPrice;
        requiredAmount = ethers.parseUnits(gDollarAmount.toString(), decimals);
      }
      if (tokenId === 'CELO') {
        // Convert USD to CELO using cached rate
        const celoAmount = Number(convertedAmount) / celoUsdPrice;
        requiredAmount = ethers.parseUnits(celoAmount.toString(), decimals);
      }

      let balance: bigint;

      // For native CELO token
      if (tokenId === 'CELO') {
        // Get native token balance using Thirdweb v5
        const { getRpcClient } = await import('thirdweb/rpc');
        const rpc = getRpcClient({ client, chain: activeChain });
        const balanceResult = await rpc({ method: 'eth_getBalance', params: [address, 'latest'] });
        balance = BigInt(balanceResult as string);
        console.log(`CELO Balance: ${balance.toString()}`);
      } else {
        // For ERC20 tokens - use Thirdweb v5 contract
        const contract = getContract({
          client,
          chain: activeChain,
          address: tokenAddress,
        });

        // Define ERC20 balanceOf function
        const { balanceOf } = await import('thirdweb/extensions/erc20');
        balance = await balanceOf({
          contract,
          address,
        });
        console.log(`${tokenId} Balance:`, balance.toString());
      }

      console.log(`Required amount:`, requiredAmount.toString());
      return balance >= BigInt(requiredAmount);
    } catch (error) {
      console.error(`Error checking ${tokenId} balance:`, error);
      toast.error(`Failed to check ${tokenId} balance`);
      return false;
    }
  };

  return {
    checkTokenBalance,
    getTokenDecimals,
    convertCurrency,
  };
};