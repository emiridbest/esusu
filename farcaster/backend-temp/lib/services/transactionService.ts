import dbConnect from '../database/connection';
import { Transaction, PaymentHash, ITransaction, IPaymentHash } from '../database/schemas';
import { UserService } from './userService';
import { ethers } from 'ethers';

export class TransactionService {
  // Validate and record payment hash to prevent reuse
  static async validateAndRecordPaymentHash(
    transactionHash: string,
    walletAddress: string,
    amount: number,
    token: string
  ): Promise<{ isValid: boolean; error?: string }> {
    await dbConnect();
    
    try {
      // Check if hash was already used
      // @ts-ignore - Mongoose union type compatibility issue
      const existingHash = await PaymentHash.findOne({ transactionHash });
      if (existingHash && existingHash.used) {
        return { isValid: false, error: 'Transaction hash already used' };
      }

      // Get or create user
      const user = await UserService.createOrUpdateUser(walletAddress);
      const userId = (user as any)._id;

      // Validate amount before saving
      
      if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        return { isValid: false, error: `Invalid amount: ${amount}` };
      }

      const paymentHashData = {
        transactionHash,
        used: true,
        usedAt: new Date(),
        amount,
        token,
        user: userId
      };

      // Record the hash as used
      // @ts-ignore - Mongoose union type compatibility issue
      await PaymentHash.findOneAndUpdate(
        { transactionHash },
        paymentHashData,
        { upsert: true, new: true, runValidators: true }
      );

      return { isValid: true };
    } catch (error: any) {
      console.error('Error validating payment hash:', error);
      return { isValid: false, error: error?.message || 'Failed to validate payment hash' };
    }
  }

  // Check if a payment hash has already been used
  static async isPaymentHashUsed(transactionHash: string): Promise<boolean> {
    await dbConnect();
    try {
      // @ts-ignore - Mongoose union type compatibility issue
      const existing = await PaymentHash.findOne({ transactionHash });
      return !!(existing && existing.used);
    } catch (error) {
      console.error('Error checking payment hash:', error);
      // Fail closed: treat as used to prevent reuse in case of DB errors
      return true;
    }
  }

  // Record a payment hash as used with optional metadata
  static async recordPaymentHash(
    transactionHash: string,
    details: { walletAddress: string; amount?: number; token?: string; timestamp?: Date }
  ): Promise<IPaymentHash> {
    await dbConnect();
    
    // Validate amount if provided
    if (details.amount !== undefined && (typeof details.amount !== 'number' || isNaN(details.amount) || details.amount <= 0)) {
      throw new Error(`Invalid amount: ${details.amount}`);
    }
    
    const user = await UserService.createOrUpdateUser(details.walletAddress);
    // @ts-ignore - Mongoose union type compatibility issue
    const doc = await PaymentHash.findOneAndUpdate(
      { transactionHash },
      {
        transactionHash,
        used: true,
        usedAt: details.timestamp || new Date(),
        amount: details.amount,
        token: details.token,
        user: user._id
      },
      { upsert: true, new: true }
    );
    return doc as IPaymentHash;
  }

  static async createTransaction(data: {
    walletAddress: string;
    transactionHash: string;
    type: 'savings' | 'withdrawal' | 'utility_payment' | 'group_contribution' | 'group_payout';
    subType?: 'airtime' | 'data' | 'electricity' | 'cable' | 'aave_deposit' | 'aave_withdrawal';
    amount: number;
    token: string;
    utilityDetails?: {
      recipient: string;
      provider: string;
      country: string;
      metadata: any;
    };
    aaveDetails?: {
      aaveTransactionHash?: string;
      underlyingAsset: string;
      apy: number;
    };
    groupDetails?: {
      groupId: string;
      contributionRound: number;
    };
  }): Promise<ITransaction> {
    await dbConnect();

    // Get or create user
    const user = await UserService.createOrUpdateUser(data.walletAddress);
    const userId = (user as any)._id;

    // Validate payment hash hasn't been used
    
    const hashValidation = await this.validateAndRecordPaymentHash(
      data.transactionHash,
      data.walletAddress,
      data.amount,
      data.token
    );

    if (!hashValidation.isValid) {
      throw new Error(hashValidation.error || 'Invalid payment hash');
    }

    const transactionData = {
      user: userId,
      transactionHash: data.transactionHash,
      type: data.type,
      subType: data.subType,
      amount: data.amount,
      token: data.token,
      status: 'pending',
      blockchainStatus: {
        confirmed: false,
        confirmations: 0
      },
      utilityDetails: data.utilityDetails,
      aaveDetails: data.aaveDetails,
      groupDetails: data.groupDetails
    };

    const transaction = new Transaction(transactionData);
    return await transaction.save();
  }

  static async updateTransactionStatus(
    transactionHash: string,
    status: 'pending' | 'confirmed' | 'failed' | 'completed',
    blockchainData?: {
      confirmed: boolean;
      blockNumber?: number;
      confirmations: number;
    }
  ): Promise<ITransaction | null> {
    await dbConnect();

    const updateData: any = { status };
    if (blockchainData) {
      updateData.blockchainStatus = blockchainData;
    }

    // @ts-ignore - Mongoose union type compatibility issue
    return Transaction.findOneAndUpdate(
      { transactionHash },
      { $set: updateData },
      { new: true }
    );
  }

  static async getTransactionsByUser(
    walletAddress: string,
    options: {
      type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ITransaction[]> {
    await dbConnect();

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) return [];
    const query: any = { user: (user as any)._id };
    if (options.type) query.type = options.type;
    if (options.status) query.status = options.status;

    // @ts-ignore - Mongoose union type compatibility issue
    return Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.offset || 0)
      .populate('user', 'walletAddress profileData');
  }

  // Backwards-compatible alias used by API routes
  static async getUserTransactions(
    walletAddress: string,
    options: {
      type?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ITransaction[]> {
    return this.getTransactionsByUser(walletAddress, options);
  }

  static async getTransactionByHash(transactionHash: string): Promise<ITransaction | null> {
    await dbConnect();
    // @ts-ignore - Mongoose union type compatibility issue
    return Transaction.findOne({ transactionHash })
      .populate('user', 'walletAddress profileData');
  }

  static async searchTransactions(query: string): Promise<ITransaction[]> {
    await dbConnect();
    const searchRegex = new RegExp(query, 'i');

    // @ts-ignore - Mongoose union type compatibility issue
    const searchResults = await Transaction.find({
      $or: [
        { transactionHash: searchRegex },
        { type: searchRegex },
        { subType: searchRegex },
        { token: searchRegex },
        { 'utilityDetails.recipient': searchRegex },
        { 'utilityDetails.provider': searchRegex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('user', 'walletAddress profileData');

    return searchResults;
  }

  static async getTransactionStats(walletAddress: string): Promise<{
    totalTransactions: number;
    totalSpent: number;
    totalSaved: number;
    utilityPayments: number;
    groupContributions: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    await dbConnect();

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) {
      return {
        totalTransactions: 0,
        totalSpent: 0,
        totalSaved: 0,
        utilityPayments: 0,
        groupContributions: 0,
        byType: {},
        byStatus: {}
      };
    }

    // @ts-ignore - Mongoose union type compatibility issue
    const stats = await Transaction.aggregate([
      { $match: { user: (user as any)._id } },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          utilityPayments: {
            $sum: { $cond: [{ $eq: ['$type', 'utility_payment'] }, 1, 0] }
          },
          groupContributions: {
            $sum: { $cond: [{ $eq: ['$type', 'group_contribution'] }, 1, 0] }
          },
          savings: {
            $sum: { $cond: [{ $eq: ['$type', 'savings'] }, '$amount', 0] }
          }
        }
      }
    ]);

    type AggStat = { _id: string; count: number };
    // @ts-ignore - Mongoose union type compatibility issue
    const typeStats: AggStat[] = await Transaction.aggregate([
      { $match: { user: (user as any)._id } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // @ts-ignore - Mongoose union type compatibility issue
    const statusStats: AggStat[] = await Transaction.aggregate([
      { $match: { user: (user as any)._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const result = stats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      utilityPayments: 0,
      groupContributions: 0,
      savings: 0
    };

    const byType: Record<string, number> = {};
    typeStats.forEach((stat: AggStat) => {
      byType[stat._id] = stat.count;
    });

    const byStatus: Record<string, number> = {};
    statusStats.forEach((stat: AggStat) => {
      byStatus[stat._id] = stat.count;
    });

    return {
      totalTransactions: result.totalTransactions,
      totalSpent: result.totalAmount - result.savings,
      totalSaved: result.savings,
      utilityPayments: result.utilityPayments,
      groupContributions: result.groupContributions,
      byType,
      byStatus
    };
  }

  static async monitorBlockchain(): Promise<void> {
    // This would be called by a cron job to monitor pending transactions
    await dbConnect();

    // @ts-ignore - Mongoose union type compatibility issue
    const pendingTransactions = await Transaction.find({
      status: 'pending',
      'blockchainStatus.confirmed': false
    });

    const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL || 'https://forno.celo.org');

    for (const tx of pendingTransactions) {
      try {
        const receipt = await provider.getTransactionReceipt(tx.transactionHash);
        if (receipt) {
          const currentBlock = await provider.getBlockNumber();
          const confirmations = currentBlock - receipt.blockNumber;

          await this.updateTransactionStatus(tx.transactionHash, 'confirmed', {
            confirmed: true,
            blockNumber: receipt.blockNumber,
            confirmations
          });

          // If enough confirmations, mark as completed
          if (confirmations >= 1) {
            await this.updateTransactionStatus(tx.transactionHash, 'completed');
          }
        }
      } catch (error) {
        console.error(`Error monitoring transaction ${tx.transactionHash}:`, error);
      }
    }
  }
}
