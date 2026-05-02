"use client";
import { useState, useEffect } from 'react';
import { parseUnits } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import { toast } from 'sonner';

const TOKEN_ADDRESSES = {
  CUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
  CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438',
  G$:   '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A',
} as const;

const tokenDecimals: Record<string, number> = {
  CELO: 18,
  cUSD: 18,
  cEUR: 18,
  USDC: 6,
  USDT: 6,
  'G$': 18,
};

const erc20BalanceAbi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export const useBalance = () => {
  const [celoUsdPrice, setCeloUsdPrice] = useState<number>(2.8);
  const [goodDollarUsdPrice, setGoodDollarUsdPrice] = useState<number>(0.0001);

  // Fetch token prices once on mount
  useEffect(() => {
    async function fetchPrices() {
      try {
        const [celoRes, gdRes] = await Promise.all([
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd'),
          fetch('https://api.coingecko.com/api/v3/simple/price?ids=gooddollar&vs_currencies=usd'),
        ]);
        const [celoData, gdData] = await Promise.all([celoRes.json(), gdRes.json()]);
        if (celoData?.celo?.usd) setCeloUsdPrice(celoData.celo.usd);
        if (gdData?.gooddollar?.usd) setGoodDollarUsdPrice(gdData.gooddollar.usd);
      } catch {
        // fall back to defaults
      }
    }
    fetchPrices();
  }, []);

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: 42220 });

  const getTokenDecimals = (token: string): number => tokenDecimals[token] ?? 18;

  const getTokenAddress = (tokenId: string): string => {
    const addr = TOKEN_ADDRESSES[tokenId as keyof typeof TOKEN_ADDRESSES];
    if (!addr) throw new Error(`Unknown token: ${tokenId}`);
    return addr;
  };

  const convertCurrency = async (amount: string, base_currency: string): Promise<number> => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error('Invalid amount for currency conversion');
    }
    try {
      const response = await fetch('/api/exchange-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, base_currency }),
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

  const checkTokenBalance = async (
    amount: string,
    tokenId: string,
    currencyCode: string
  ): Promise<boolean> => {
    if (!address || !isConnected || !publicClient) {
      toast.error('Wallet not connected');
      return false;
    }

    try {
      const tokenAddress = getTokenAddress(tokenId);
      const decimals = getTokenDecimals(tokenId);

      // Convert local currency → USD equivalent
      const convertedAmount = await convertCurrency(amount, currencyCode);

      // Apply token-specific USD → token conversion
      let requiredAmount: bigint;
      if (tokenId === 'G$') {
        const gDollarAmount = Number(convertedAmount) / goodDollarUsdPrice;
        requiredAmount = parseUnits(gDollarAmount.toString(), decimals);
      } else if (tokenId === 'CELO') {
        const celoAmount = Number(convertedAmount) / celoUsdPrice;
        requiredAmount = parseUnits(celoAmount.toString(), decimals);
      } else {
        requiredAmount = parseUnits(convertedAmount.toString(), decimals);
      }

      let balance: bigint;

      if (tokenId === 'CELO') {
        // Native CELO balance via viem
        const result = await publicClient.getBalance({ address: address as `0x${string}` });
        balance = result;
        console.log(`CELO Balance: ${balance.toString()}`);
      } else {
        // ERC20 balance via viem
        balance = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20BalanceAbi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
          authorizationList: undefined,
        }) as bigint;
        console.log(`${tokenId} Balance: ${balance.toString()}`);
      }

      console.log(`Required amount: ${requiredAmount.toString()}`);
      return balance >= requiredAmount;
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