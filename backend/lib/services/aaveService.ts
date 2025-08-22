import { ethers } from 'ethers';
import dbConnect from '../database/connection';
import { Transaction } from '../database/schemas';
import { UserService } from './userService';
import { TransactionService } from './transactionService';
import { NotificationService } from './notificationService';

// Aave V3 Pool contract address on Celo
const AAVE_POOL_ADDRESS = '0x48424f2779be0f03cdf6bf0c5b1b66b1b7eabbf7'; // Celo Aave V3 Pool
const CELO_RPC_URL = process.env.CELO_RPC_URL ||'https://celo-mainnet.infura.io/v3/0bbb45846bdf44d1bcbe6275327619ad';

// Supported assets for Aave on Celo
const SUPPORTED_ASSETS = {
  'cUSD': {
    address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    aToken: '0x6Eaa0e11bD0C333Fda31B2B70C8680ad54a3DE3c', // acUSD
    decimals: 18
  },
  'USDC': {
    address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    aToken: '0x16cC2Ea3ea95Be44c26B7b6456de46F5aF0D08ca', // aUSDC
    decimals: 6
  },
  'CELO': {
    address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
    aToken: '0x0Cc8C5e2F7C65EFd2b0a894Bb05c5FdF9b0a0A09', // aCELO
    decimals: 18
  }
};

// Aave Pool ABI (minimal interface for deposit/withdraw)
const AAVE_POOL_ABI = [
  'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to) returns (uint256)',
  'function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
  'function getReserveData(address asset) external view returns (uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt)'
];

// aToken ABI (minimal interface)
const ATOKEN_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)'
];

export class AaveService {
  private static provider = new ethers.JsonRpcProvider(CELO_RPC_URL);

  static async depositToAave(
    walletAddress: string,
    asset: keyof typeof SUPPORTED_ASSETS,
    amount: number,
    privateKey?: string // For automated deposits, if available
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    aaveTransactionHash?: string;
    error?: string;
  }> {
    try {
      await dbConnect();

      const assetInfo = SUPPORTED_ASSETS[asset];
      if (!assetInfo) {
        throw new Error(`Unsupported asset: ${asset}`);
      }

      // If private key provided, execute the transaction
      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey, this.provider);
        const poolContract = new ethers.Contract(AAVE_POOL_ADDRESS, AAVE_POOL_ABI, wallet);

        // Convert amount to proper decimals
        const amountWei = ethers.parseUnits(amount.toString(), assetInfo.decimals);

        // Execute Aave deposit
        const tx = await poolContract.supply(
          assetInfo.address,
          amountWei,
          walletAddress,
          0 // referral code
        );

        const receipt = await tx.wait();
        
        // Get current APY
        const currentAPY = await this.getCurrentAPY(asset);

        // Update user's Aave balance
        const user = await UserService.getUserByWallet(walletAddress);
        if (user) {
          await UserService.updateUserSavings(walletAddress, {
            aaveDeposits: user.savings.aaveDeposits + amount,
            currentAPY
          });
        }

        // Record transaction
        await TransactionService.createTransaction({
          walletAddress,
          transactionHash: receipt.hash,
          type: 'savings',
          subType: 'aave_deposit',
          amount,
          token: asset,
          aaveDetails: {
            aaveTransactionHash: receipt.hash,
            underlyingAsset: assetInfo.address,
            apy: currentAPY
          }
        });

        // Send success notification
        await NotificationService.createNotification({
          userWallet: walletAddress,
          type: 'savings_milestone',
          title: 'Aave Deposit Successful! 💰',
          message: `Successfully deposited ${amount} ${asset} to Aave. You're earning ${currentAPY.toFixed(2)}% APY!`,
          data: { amount, asset, apy: currentAPY }
        });

        return {
          success: true,
          transactionHash: receipt.hash,
          aaveTransactionHash: receipt.hash
        };
      } else {
        // Return transaction data for user to sign
        const poolContract = new ethers.Contract(AAVE_POOL_ADDRESS, AAVE_POOL_ABI, this.provider);
        const amountWei = ethers.parseUnits(amount.toString(), assetInfo.decimals);

        const txData = poolContract.interface.encodeFunctionData('supply', [
          assetInfo.address,
          amountWei,
          walletAddress,
          0
        ]);

        return {
          success: true,
          transactionHash: txData // Return encoded transaction data
        };
      }
    } catch (error) {
      console.error('Aave deposit error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async withdrawFromAave(
    walletAddress: string,
    asset: keyof typeof SUPPORTED_ASSETS,
    amount: number,
    privateKey?: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    withdrawnAmount?: number;
    error?: string;
  }> {
    try {
      await dbConnect();

      const assetInfo = SUPPORTED_ASSETS[asset];
      if (!assetInfo) {
        throw new Error(`Unsupported asset: ${asset}`);
      }

      // Check user's Aave balance
      const aaveBalance = await this.getAaveBalance(walletAddress, asset);
      if (aaveBalance < amount) {
        throw new Error('Insufficient Aave balance');
      }

      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey, this.provider);
        const poolContract = new ethers.Contract(AAVE_POOL_ADDRESS, AAVE_POOL_ABI, wallet);

        const amountWei = ethers.parseUnits(amount.toString(), assetInfo.decimals);

        // Execute withdrawal
        const tx = await poolContract.withdraw(
          assetInfo.address,
          amountWei,
          walletAddress
        );

        const receipt = await tx.wait();

        // Update user's Aave balance
        const user = await UserService.getUserByWallet(walletAddress);
        if (user) {
          await UserService.updateUserSavings(walletAddress, {
            aaveDeposits: Math.max(0, user.savings.aaveDeposits - amount)
          });
        }

        // Record transaction
        await TransactionService.createTransaction({
          walletAddress,
          transactionHash: receipt.hash,
          type: 'withdrawal',
          subType: 'aave_withdrawal',
          amount,
          token: asset,
          aaveDetails: {
            aaveTransactionHash: receipt.hash,
            underlyingAsset: assetInfo.address,
            apy: 0
          }
        });

        return {
          success: true,
          transactionHash: receipt.hash,
          withdrawnAmount: amount
        };
      } else {
        // Return transaction data for user to sign
        const poolContract = new ethers.Contract(AAVE_POOL_ADDRESS, AAVE_POOL_ABI, this.provider);
        const amountWei = ethers.parseUnits(amount.toString(), assetInfo.decimals);

        const txData = poolContract.interface.encodeFunctionData('withdraw', [
          assetInfo.address,
          amountWei,
          walletAddress
        ]);

        return {
          success: true,
          transactionHash: txData
        };
      }
    } catch (error) {
      console.error('Aave withdrawal error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static async getAaveBalance(
    walletAddress: string,
    asset: keyof typeof SUPPORTED_ASSETS
  ): Promise<number> {
    try {
      const assetInfo = SUPPORTED_ASSETS[asset];
      if (!assetInfo) return 0;

      const aTokenContract = new ethers.Contract(
        assetInfo.aToken,
        ATOKEN_ABI,
        this.provider
      );

      const balance = await aTokenContract.balanceOf(walletAddress);
      return parseFloat(ethers.formatUnits(balance, assetInfo.decimals));
    } catch (error) {
      console.error('Error getting Aave balance:', error);
      return 0;
    }
  }

  static async getAllAaveBalances(walletAddress: string): Promise<{
    [key in keyof typeof SUPPORTED_ASSETS]: {
      balance: number;
      apy: number;
      usdValue: number;
    };
  }> {
    const balances = {} as any;

    for (const [asset, info] of Object.entries(SUPPORTED_ASSETS)) {
      const balance = await this.getAaveBalance(walletAddress, asset as keyof typeof SUPPORTED_ASSETS);
      const apy = await this.getCurrentAPY(asset as keyof typeof SUPPORTED_ASSETS);
      
      balances[asset] = {
        balance,
        apy,
        usdValue: balance // Simplified - would need price oracle for accurate USD value
      };
    }

    return balances;
  }

  static async getCurrentAPY(asset: keyof typeof SUPPORTED_ASSETS): Promise<number> {
    try {
      const assetInfo = SUPPORTED_ASSETS[asset];
      const poolContract = new ethers.Contract(AAVE_POOL_ADDRESS, AAVE_POOL_ABI, this.provider);
      
      const reserveData = await poolContract.getReserveData(assetInfo.address);
      const liquidityRate = reserveData.currentLiquidityRate;
      
      // Convert from Ray (27 decimals) to percentage
      const APY = (Number(liquidityRate) / 1e27) * 100;
      return APY;
    } catch (error) {
      console.error('Error getting APY:', error);
      return 0;
    }
  }

  static async getUserAccountData(walletAddress: string): Promise<{
    totalCollateral: number;
    totalDebt: number;
    availableBorrows: number;
    healthFactor: number;
  }> {
    try {
      const poolContract = new ethers.Contract(AAVE_POOL_ADDRESS, AAVE_POOL_ABI, this.provider);
      
      const accountData = await poolContract.getUserAccountData(walletAddress);
      
      return {
        totalCollateral: parseFloat(ethers.formatUnits(accountData.totalCollateralBase, 8)), // Base unit is 8 decimals
        totalDebt: parseFloat(ethers.formatUnits(accountData.totalDebtBase, 8)),
        availableBorrows: parseFloat(ethers.formatUnits(accountData.availableBorrowsBase, 8)),
        healthFactor: parseFloat(ethers.formatUnits(accountData.healthFactor, 18))
      };
    } catch (error) {
      console.error('Error getting user account data:', error);
      return {
        totalCollateral: 0,
        totalDebt: 0,
        availableBorrows: 0,
        healthFactor: 0
      };
    }
  }

  static async calculateEarnings(
    walletAddress: string,
    timeframeInDays: number = 30
  ): Promise<{
    totalEarnings: number;
    dailyEarnings: number;
    projectedMonthly: number;
    projectedYearly: number;
  }> {
    try {
      await dbConnect();

      // Get all Aave deposits for the user in the timeframe
      const deposits = await Transaction.find({
        user: (await UserService.getUserByWallet(walletAddress))?._id,
        type: 'savings',
        subType: 'aave_deposit',
        createdAt: { $gte: new Date(Date.now() - timeframeInDays * 24 * 60 * 60 * 1000) }
      });

      let totalEarnings = 0;
      
      // Calculate earnings for each deposit
      for (const deposit of deposits) {
        const daysInvested = Math.min(
          timeframeInDays,
          (Date.now() - deposit.createdAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        
        const apy = deposit.aaveDetails?.apy || 0;
        const dailyRate = apy / 365 / 100;
        const earnings = deposit.amount * dailyRate * daysInvested;
        
        totalEarnings += earnings;
      }

      const dailyEarnings = totalEarnings / timeframeInDays;
      const projectedMonthly = dailyEarnings * 30;
      const projectedYearly = dailyEarnings * 365;

      return {
        totalEarnings,
        dailyEarnings,
        projectedMonthly,
        projectedYearly
      };
    } catch (error) {
      console.error('Error calculating earnings:', error);
      return {
        totalEarnings: 0,
        dailyEarnings: 0,
        projectedMonthly: 0,
        projectedYearly: 0
      };
    }
  }

  static async getTopAaveUsers(limit: number = 10): Promise<Array<{
    walletAddress: string;
    totalDeposited: number;
    totalEarnings: number;
    rank: number;
  }>> {
    try {
      await dbConnect();

      const topUsers = await Transaction.aggregate([
        { $match: { type: 'savings', subType: 'aave_deposit' } },
        {
          $group: {
            _id: '$user',
            totalDeposited: { $sum: '$amount' },
            depositCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        { $sort: { totalDeposited: -1 } },
        { $limit: limit }
      ]);

      return topUsers.map((user, index) => ({
        walletAddress: user.user.walletAddress,
        totalDeposited: user.totalDeposited,
        totalEarnings: 0, // Would need to calculate based on time and APY
        rank: index + 1
      }));
    } catch (error) {
      console.error('Error getting top Aave users:', error);
      return [];
    }
  }
}
