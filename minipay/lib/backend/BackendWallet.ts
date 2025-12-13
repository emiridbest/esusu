import { createPublicClient, createWalletClient, http, parseEther, formatUnits } from 'viem';
import { celo } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { stableTokenABI } from '@/lib/abis/stableTokenABI';

export interface TransactionRequest {
  to: `0x${string}`;
  value?: string;
  data?: `0x${string}`;
  tokenAddress?: `0x${string}`;
  tokenAmount?: string;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
  blockNumber?: number;
}

export class BackendWallet {
  private publicClient: any;
  private walletClient: any;
  private account: any;

  constructor() {
    // Initialize with environment variables
    const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
    }

    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    
    this.publicClient = createPublicClient({
      chain: celo,
      transport: http(process.env.CELO_RPC_URL || 'https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8'),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: celo,
      transport: http(process.env.CELO_RPC_URL || 'https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8'),
    });
  }

  async getBalance(address?: `0x${string}`): Promise<string> {
    try {
      const balance = await this.publicClient.getBalance({
        address: address || this.account.address,
      });
      return formatUnits(balance, 18);
    } catch (error) {
      console.error('Error getting balance:', error);
      throw new Error('Failed to get balance');
    }
  }

  async getTokenBalance(tokenAddress: `0x${string}`, address?: `0x${string}`): Promise<string> {
    try {
      const balance = await this.publicClient.readContract({
        address: tokenAddress,
        abi: stableTokenABI,
        functionName: 'balanceOf',
        args: [address || this.account.address],
      });
      return formatUnits(balance, 18);
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw new Error('Failed to get token balance');
    }
  }

  async sendCELO(request: TransactionRequest): Promise<TransactionResult> {
    try {
      const hash = await this.walletClient.sendTransaction({
        to: request.to,
        value: request.value ? parseEther(request.value) : BigInt(0),
        data: request.data,
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      
      return {
        success: true,
        transactionHash: hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: Number(receipt.blockNumber),
      };
    } catch (error) {
      console.error('Error sending CELO:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendToken(request: TransactionRequest): Promise<TransactionResult> {
    try {
      if (!request.tokenAddress || !request.tokenAmount) {
        throw new Error('Token address and amount are required');
      }

      const hash = await this.walletClient.writeContract({
        address: request.tokenAddress,
        abi: stableTokenABI,
        functionName: 'transfer',
        args: [request.to, parseEther(request.tokenAmount)],
      });

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      
      return {
        success: true,
        transactionHash: hash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: Number(receipt.blockNumber),
      };
    } catch (error) {
      console.error('Error sending token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async executeTransaction(request: TransactionRequest): Promise<TransactionResult> {
    if (request.tokenAddress) {
      return this.sendToken(request);
    } else {
      return this.sendCELO(request);
    }
  }

  async getTransactionHistory(address: `0x${string}`, limit: number = 10): Promise<any[]> {
    try {
      // This would integrate with your existing transaction fetching logic
      // For now, return empty array - you can implement this based on your existing code
      return [];
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  getAddress(): `0x${string}` {
    return this.account.address;
  }
}

// Singleton instance
let backendWallet: BackendWallet | null = null;

export function getBackendWallet(): BackendWallet {
  if (!backendWallet) {
    backendWallet = new BackendWallet();
  }
  return backendWallet;
}

