import { useAccount, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { config } from '../../components/providers/WagmiProvider';

const TOKEN_ADDRESSES = {
  CUSD: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
  CELO: '0x471EcE3750Da237f93B8E339c536989b8978a438', // Native CELO token
  G$: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A", // G$ token address
};

export const useBalance = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient({ config });

  const getTokenDecimals = (token: string): number => {
    switch (token) {
      case 'CUSD':
        return 18;
      case 'USDC':
      case 'USDT':
        return 6;
      case 'G$':
        return 18;
      default:
        return 18;
    }
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


  // Helper to get token address from token ID
  const getTokenAddress = (tokenId: string): string => {
    const address = TOKEN_ADDRESSES[tokenId as keyof typeof TOKEN_ADDRESSES];
    if (!address) {
      throw new Error(`Unknown token: ${tokenId}`);
    }
    return address;
  };

  // Check if user has enough token balance to pay for the utility
  const checkTokenBalance = async (tokenId: string, amount: string, currencyCode: string): Promise<boolean> => {
    if (!address) {
      return false;
    }

    try {
      const tokenAddress = getTokenAddress(tokenId);
      const decimals = getTokenDecimals(tokenId);


      // For native CELO token
      if (tokenId === 'CELO') {
        const balance = await publicClient.getBalance({ address });
        const convertedAmount = await convertCurrency(amount, currencyCode)
        const requiredAmount = BigInt(ethers.parseUnits(convertedAmount.toString()));


        return balance >= BigInt(requiredAmount.toString());
      }

      // For ERC20 tokens
      const erc20Abi = [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ] as const;

      // Read token balance using the correct contract address
      // @ts-ignore - viem 2.38+ type compatibility
      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });


      const convertedAmount = await convertCurrency(amount, currencyCode)
      const requiredAmount = BigInt(ethers.parseUnits(convertedAmount.toString(), decimals));

      return balance >= requiredAmount;
    } catch (error) {
      console.error('Failed to check token balance:', error);
      return false;
    }
  };

  return { checkTokenBalance };
};