import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
} from 'viem';
import { celo } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { Cashback } from '../database/schemas';
import connectToDatabase from '../database/connection';

// CashBackVault ABI (only the cashBack function is needed server-side)
const CASHBACK_VAULT_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'cashBack',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const CASHBACK_VAULT_ADDRESS =
  '0x7AdE783F709bCd51a0FB28D00f0F1935DC4101F9' as `0x${string}`;

const G_DOLLAR_ADDRESS =
  '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A' as `0x${string}`;

// Program rules
const CASHBACK_RATE = 0.20;     // 20% of the G$ amount paid
const MIN_PAYMENT_GD = 300;     // Minimum qualifying payment in G$
const MAX_CASHBACK_GD = 10000;  // Per-transaction cap in G$

export interface CashbackRequest {
  sourceTxHash: string;
  userAddress: string;
  /** Amount of G$ the user paid, in human-readable units (e.g. 1200.5) */
  paymentAmountGD: number;
  utilityType: 'airtime' | 'data' | 'electricity' | 'cable';
}

export interface CashbackResult {
  success: boolean;
  cashbackAmountGD?: number;
  cashbackTxHash?: string;
  alreadyProcessed?: boolean;
  ineligible?: boolean;
  error?: string;
}

export class CashbackService {
  private walletClient: any;
  private publicClient: any;
  private account: ReturnType<typeof privateKeyToAccount>;

  constructor() {
    const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('BACKEND_WALLET_PRIVATE_KEY is not configured');
    }

    this.account = privateKeyToAccount(privateKey as `0x${string}`);

    this.publicClient = createPublicClient({
      chain: celo,
      transport: http(process.env.CELO_RPC_URL ?? 'https://forno.celo.org'),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: celo,
      transport: http(process.env.CELO_RPC_URL ?? 'https://forno.celo.org'),
    });
  }

  /**
   * Processes a 20% G$ cashback for a confirmed utility payment.
   * Eligibility: payment must be in G$ and amount >= 300 G$.
   * Cap: 10,000 G$ cashback per transaction.
   * Idempotent — duplicate calls for the same sourceTxHash are silently skipped.
   */
  async processCashback(req: CashbackRequest): Promise<CashbackResult> {
    await connectToDatabase();

    // Eligibility: minimum 300 G$
    if (req.paymentAmountGD < MIN_PAYMENT_GD) {
      return { success: false, ineligible: true };
    }

    // Idempotency check
    const existing = await Cashback.findOne({ sourceTxHash: req.sourceTxHash });
    if (existing?.status === 'sent') {
      return {
        success: true,
        alreadyProcessed: true,
        cashbackAmountGD: existing.cashbackAmountGD,
        cashbackTxHash: existing.cashbackTxHash,
      };
    }

    // Calculate 20% cashback, capped at 10,000 G$
    const cashbackAmountGD = Math.min(
      req.paymentAmountGD * CASHBACK_RATE,
      MAX_CASHBACK_GD
    );

    // Persist as pending before sending (prevents duplicate concurrent calls)
    const cashbackDoc = existing ?? new Cashback({
      sourceTxHash: req.sourceTxHash,
      userAddress: req.userAddress,
      paymentAmountGD: req.paymentAmountGD,
      cashbackAmountGD,
      utilityType: req.utilityType,
      status: 'pending',
    });

    cashbackDoc.cashbackAmountGD = cashbackAmountGD;
    cashbackDoc.status = 'pending';
    await cashbackDoc.save();

    try {
      // Convert to on-chain units (G$ has 18 decimals)
      const cashbackWei = parseUnits(cashbackAmountGD.toFixed(6), 18);

      // Call CashBackVault.cashBack(G$_address, userAddress, amount)
      const txHash = await this.walletClient.writeContract({
        address: CASHBACK_VAULT_ADDRESS,
        abi: CASHBACK_VAULT_ABI,
        functionName: 'cashBack',
        args: [G_DOLLAR_ADDRESS, req.userAddress as `0x${string}`, cashbackWei],
        chain: celo,
      });

      await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      cashbackDoc.cashbackTxHash = txHash;
      cashbackDoc.status = 'sent';
      await cashbackDoc.save();

      return { success: true, cashbackAmountGD, cashbackTxHash: txHash };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      cashbackDoc.status = 'failed';
      cashbackDoc.errorMessage = errorMessage;
      await cashbackDoc.save();

      console.error('[CashbackService] Failed to disburse cashback:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /** Returns cashback history for a given wallet address. */
  async getCashbackHistory(userAddress: string, limit = 20) {
    await connectToDatabase();
    return Cashback.find({ userAddress })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}
