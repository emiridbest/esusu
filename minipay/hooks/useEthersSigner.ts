import { useMemo } from 'react';
import { useWalletClient } from 'wagmi';
import { BrowserProvider, JsonRpcSigner, type Eip1193Provider } from 'ethers';
import type { WalletClient } from 'viem';

/**
 * Converts a viem WalletClient to an ethers.js Signer
 * This allows us to use ethers.js contracts with wagmi/viem wallet clients
 */
export function walletClientToSigner(walletClient: WalletClient) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  
  // Create an EIP-1193 provider wrapper for viem transport
  const eip1193Provider: Eip1193Provider = {
    request: async ({ method, params }: { method: string; params?: any[] | Record<string, any> }) => {
      try {
        // Log for debugging contract calls
        if (method === 'eth_estimateGas' || method === 'eth_sendTransaction') {
          console.log(`[useEthersSigner] ${method}`, params);
        }
        
        const result = await transport.request({ 
          method: method as any, 
          params: params as any 
        });
        
        if (method === 'eth_estimateGas' || method === 'eth_sendTransaction') {
          console.log(`[useEthersSigner] ${method} result:`, result);
        }
        
        return result;
      } catch (error: any) {
        // Re-throw with more context for debugging
        console.error(`[useEthersSigner] EIP-1193 request failed: ${method}`, {
          params,
          error: error.message || error
        });
        throw error;
      }
    }
  };
  
  const provider = new BrowserProvider(eip1193Provider, network);
  const signer = new JsonRpcSigner(provider, account.address);
  return signer;
}

/**
 * Hook to get an ethers.js Signer from wagmi
 * Returns null if wallet is not connected
 */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: walletClient } = useWalletClient({ chainId });
  
  return useMemo(
    () => (walletClient ? walletClientToSigner(walletClient) : null),
    [walletClient]
  );
}
