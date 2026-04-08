import { createWalletClient, http, parseEther, formatEther, parseAbi, type Address } from 'viem';
import { celo } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import dbConnect from '../database/connection';
import { GasSponsorship, IGasSponsorship } from '../database/schemas';
import { getGasEstimationService, type GasEstimateParams } from './gasEstimationService';

// Configuration with environment variables and defaults
const config = {
    privateKey: process.env.BACKEND_WALLET_PRIVATE_KEY,
    rpcUrl: process.env.CELO_RPC_URL || 'https://forno.celo.org',
    dailyLimitPerUser: parseInt(process.env.GAS_SPONSORSHIP_DAILY_LIMIT_PER_USER || '10'),
    maxAmountCELO: parseFloat(process.env.GAS_SPONSORSHIP_MAX_AMOUNT_CELO || '0.1'),
    cooldownMinutes: parseInt(process.env.GAS_SPONSORSHIP_COOLDOWN_MINUTES || '0'),
    lowBalanceThreshold: parseFloat(process.env.GAS_SPONSORSHIP_LOW_BALANCE_THRESHOLD || '100'),
    celoUsdPrice: parseFloat(process.env.CELO_USD_PRICE || '0.6'),
};

// USDT on Celo — whitelisted as a gas fee currency
const USDT_FEE_CURRENCY = {
    address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as Address,
    decimals: 6,
    token: 'USDT',
};

export interface SponsorshipResult {
    success: boolean;
    transactionHash?: string;
    amountSponsored?: string;
    sponsoredToken: string;
    feeCurrency?: string;
    gasEstimate: {
        gasLimit: string;
        totalCost: string;
    };
    message: string;
    error?: string;
}

export class GasSponsorshipService {
    private walletClient: any;
    private account: any;
    private gasEstimator: any;

    constructor() {
        if (!config.privateKey) {
            throw new Error('BACKEND_WALLET_PRIVATE_KEY environment variable is required');
        }

        this.account = privateKeyToAccount(config.privateKey as `0x${string}`);
        this.gasEstimator = getGasEstimationService();

        this.walletClient = createWalletClient({
            account: this.account,
            chain: celo,
            transport: http(config.rpcUrl),
        });
    }

    /**
     * Main entry point: Always sponsor gas for every transaction.
     * If isMiniPay=true, sends USDT to cover gas (MiniPay uses USDT as feeCurrency).
     * If isMiniPay=false, sends native CELO to cover gas.
     * If sponsorship fails, the transaction can still proceed.
     */
    async checkAndSponsorGas(
        params: GasEstimateParams,
        isMiniPay: boolean = false
    ): Promise<SponsorshipResult> {
        const token = isMiniPay ? 'USDT' : 'CELO';
        try {
            // Step 1: Estimate gas for the transaction
            const gasEstimate = await this.gasEstimator.estimateTransactionGas(params);

            // Step 2: Apply 1.5x safety buffer
            const requiredGasWithBuffer = gasEstimate.totalCostWei * BigInt(150) / BigInt(100);

            console.log(`🔥 ALWAYS-SPONSOR (${token}) - Estimated:`, gasEstimate.totalCostCELO, 'CELO, Sponsoring with 1.5x buffer:', (Number(requiredGasWithBuffer) / 1e18).toFixed(6), 'CELO');

            // Step 2b: Check rate limits and eligibility
            const eligibilityCheck = await this.checkSponsorshipEligibility(
                params.userAddress,
                gasEstimate.totalCostCELO
            );

            if (!eligibilityCheck.canSponsor) {
                return {
                    success: false,
                    sponsoredToken: token,
                    ...(isMiniPay && { feeCurrency: USDT_FEE_CURRENCY.address }),
                    gasEstimate: {
                        gasLimit: gasEstimate.gasLimit.toString(),
                        totalCost: gasEstimate.totalCostCELO,
                    },
                    message: eligibilityCheck.reason || 'Cannot sponsor gas at this time',
                    error: eligibilityCheck.reason,
                };
            }

            // Step 3: Sponsor the gas — USDT for MiniPay, CELO for others
            if (isMiniPay) {
                return this.sponsorGasWithUsdt(
                    params.userAddress,
                    requiredGasWithBuffer,
                    gasEstimate,
                    { contractAddress: params.contractAddress, functionName: params.functionName }
                );
            }

            return this.sponsorGas(
                params.userAddress,
                requiredGasWithBuffer,
                gasEstimate,
                { contractAddress: params.contractAddress, functionName: params.functionName }
            );
        } catch (error) {
            console.error('Error in checkAndSponsorGas:', error);
            return {
                success: false,
                sponsoredToken: token,
                ...(isMiniPay && { feeCurrency: USDT_FEE_CURRENCY.address }),
                gasEstimate: {
                    gasLimit: '0',
                    totalCost: '0',
                },
                message: 'Failed to check and sponsor gas',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Check if user is eligible for gas sponsorship
     */
    private async checkSponsorshipEligibility(
        userAddress: Address,
        requestedAmountCELO: string
    ): Promise<{ canSponsor: boolean; reason?: string }> {
        await dbConnect();

        // Check 1: Amount limit
        const requestedAmount = parseFloat(requestedAmountCELO);
        if (requestedAmount > config.maxAmountCELO) {
            return {
                canSponsor: false,
                reason: `Requested amount (${requestedAmountCELO} CELO) exceeds maximum (${config.maxAmountCELO} CELO)`,
            };
        }

        // Check 2: Daily limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // @ts-ignore - Mongoose union type compatibility issue
        const todaySponsorships = await GasSponsorship.countDocuments({
            recipientAddress: userAddress.toLowerCase(),
            createdAt: { $gte: today },
            status: { $in: ['completed', 'pending'] },
        });

        if (todaySponsorships >= config.dailyLimitPerUser) {
            return {
                canSponsor: false,
                reason: `Daily sponsorship limit reached (${config.dailyLimitPerUser} per day)`,
            };
        }

        // Check 3: Cooldown period
        const cooldownTime = new Date(Date.now() - config.cooldownMinutes * 60 * 1000);
        // @ts-ignore - Mongoose union type compatibility issue
        const recentSponsorship = await GasSponsorship.findOne({
            recipientAddress: userAddress.toLowerCase(),
            createdAt: { $gte: cooldownTime },
            status: { $in: ['completed', 'pending'] },
        }).sort({ createdAt: -1 });

        if (recentSponsorship) {
            const minutesAgo = Math.floor(
                (Date.now() - recentSponsorship.createdAt.getTime()) / (60 * 1000)
            );
            return {
                canSponsor: false,
                reason: `Please wait ${config.cooldownMinutes - minutesAgo} more minutes before requesting another sponsorship`,
            };
        }

        // Check 4: Backend wallet balance
        const backendBalance = await this.gasEstimator.getUserBalance(this.account.address);
        const backendBalanceCELO = parseFloat(backendBalance.balanceCELO);

        if (backendBalanceCELO < requestedAmount) {
            console.error('Backend wallet has insufficient balance for sponsorship');
            return {
                canSponsor: false,
                reason: 'Gas sponsorship service temporarily unavailable. Please try again later.',
            };
        }

        // Warn if backend wallet is running low
        if (backendBalanceCELO < config.lowBalanceThreshold) {
            console.warn(
                `WARNING: Backend wallet balance (${backendBalanceCELO} CELO) is below threshold (${config.lowBalanceThreshold} CELO)`
            );
        }

        return { canSponsor: true };
    }

    /**
     * Send gas to user's address
     */
    private async sponsorGas(
        recipientAddress: Address,
        amountWei: bigint,
        gasEstimate: any,
        metadata: { contractAddress: Address; functionName: string }
    ): Promise<SponsorshipResult> {
        await dbConnect();

        try {
            // Get user's current balance
            const userBalance = await this.gasEstimator.getUserBalance(recipientAddress);

            // Send CELO to user for gas
            const hash = await this.walletClient.sendTransaction({
                to: recipientAddress,
                value: amountWei,
            });

            // Wait for transaction confirmation
            const publicClient = this.gasEstimator.publicClient;
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            const amountCELO = formatEther(amountWei);

            // Record sponsorship in database
            // @ts-ignore - Mongoose union type compatibility issue
            const sponsorship = await GasSponsorship.create({
                recipientAddress: recipientAddress.toLowerCase(),
                amountCELO,
                transactionHash: hash,
                status: receipt.status === 'success' ? 'completed' : 'failed',
                sponsoredToken: 'CELO',
                gasEstimate: {
                    gasLimit: gasEstimate.gasLimit.toString(),
                    maxFeePerGas: gasEstimate.maxFeePerGas.toString(),
                    maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas?.toString(),
                    totalCostCELO: gasEstimate.totalCostCELO,
                },
                userBalanceBefore: userBalance.balanceCELO,
                metadata: {
                    contractAddress: metadata.contractAddress,
                    functionName: metadata.functionName,
                    timestamp: new Date(),
                },
            });

            console.log(`Gas sponsored for ${recipientAddress}: ${amountCELO} CELO (tx: ${hash})`);

            return {
                success: true,
                transactionHash: hash,
                amountSponsored: amountCELO,
                sponsoredToken: 'CELO',
                gasEstimate: {
                    gasLimit: gasEstimate.gasLimit.toString(),
                    totalCost: gasEstimate.totalCostCELO,
                },
                message: `Gas sponsored successfully! ${amountCELO} CELO sent to your wallet.`,
            };
        } catch (error) {
            console.error('Error sponsoring gas:', error);

            // Record failed sponsorship attempt
            try {
                // @ts-ignore - Mongoose union type compatibility issue
                await GasSponsorship.create({
                    recipientAddress: recipientAddress.toLowerCase(),
                    amountCELO: formatEther(amountWei),
                    transactionHash: 'failed',
                    status: 'failed',
                    gasEstimate: {
                        gasLimit: gasEstimate.gasLimit.toString(),
                        maxFeePerGas: gasEstimate.maxFeePerGas.toString(),
                        maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas?.toString(),
                        totalCostCELO: gasEstimate.totalCostCELO,
                    },
                    userBalanceBefore: '0',
                    metadata: {
                        contractAddress: metadata.contractAddress,
                        functionName: metadata.functionName,
                        timestamp: new Date(),
                    },
                });
            } catch (dbError) {
                console.error('Failed to record failed sponsorship:', dbError);
            }

            return {
                success: false,
                sponsoredToken: 'CELO',
                gasEstimate: {
                    gasLimit: gasEstimate.gasLimit.toString(),
                    totalCost: gasEstimate.totalCostCELO,
                },
                message: 'Failed to sponsor gas',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Send USDT to user's address for gas (MiniPay users).
     * Converts CELO gas estimate to USDT equivalent and sends ERC-20 transfer.
     */
    private async sponsorGasWithUsdt(
        recipientAddress: Address,
        celoAmountWei: bigint,
        gasEstimate: any,
        metadata: { contractAddress: Address; functionName: string }
    ): Promise<SponsorshipResult> {
        await dbConnect();

        try {
            // Convert CELO gas cost to USDT equivalent
            const celoAmount = Number(celoAmountWei) / 1e18;
            const usdtAmount = celoAmount * config.celoUsdPrice;
            // Minimum 100 units (0.0001 USDT) to avoid dust
            const usdtSmallest = BigInt(Math.max(Math.ceil(usdtAmount * 1e6), 100));

            // Check backend wallet's USDT balance
            const backendUsdtBalance = await this.gasEstimator.getERC20Balance(
                this.account.address,
                USDT_FEE_CURRENCY.address,
                USDT_FEE_CURRENCY.decimals
            );

            if (backendUsdtBalance < usdtSmallest) {
                console.error('Backend wallet has insufficient USDT balance for sponsorship');
                return {
                    success: false,
                    sponsoredToken: 'USDT',
                    feeCurrency: USDT_FEE_CURRENCY.address,
                    gasEstimate: {
                        gasLimit: gasEstimate.gasLimit.toString(),
                        totalCost: gasEstimate.totalCostCELO,
                    },
                    message: 'Gas sponsorship service temporarily unavailable. Please try again later.',
                    error: 'Insufficient backend USDT balance',
                };
            }

            // Get user's current balance for record-keeping
            const userBalance = await this.gasEstimator.getUserBalance(recipientAddress);

            // Send USDT to user via ERC-20 transfer
            const erc20Abi = parseAbi(['function transfer(address, uint256) returns (bool)']);
            const hash = await this.walletClient.writeContract({
                address: USDT_FEE_CURRENCY.address,
                abi: erc20Abi,
                functionName: 'transfer',
                args: [recipientAddress, usdtSmallest],
            });

            // Wait for transaction confirmation
            const publicClient = this.gasEstimator.publicClient;
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            const usdtFormatted = (Number(usdtSmallest) / 1e6).toFixed(6);

            // Record sponsorship in database
            // @ts-ignore - Mongoose union type compatibility issue
            await GasSponsorship.create({
                recipientAddress: recipientAddress.toLowerCase(),
                amountCELO: usdtFormatted,
                transactionHash: hash,
                status: receipt.status === 'success' ? 'completed' : 'failed',
                sponsoredToken: 'USDT',
                gasEstimate: {
                    gasLimit: gasEstimate.gasLimit.toString(),
                    maxFeePerGas: gasEstimate.maxFeePerGas.toString(),
                    maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas?.toString(),
                    totalCostCELO: gasEstimate.totalCostCELO,
                },
                userBalanceBefore: userBalance.balanceCELO,
                metadata: {
                    contractAddress: metadata.contractAddress,
                    functionName: metadata.functionName,
                    timestamp: new Date(),
                },
            });

            console.log(`Gas sponsored (USDT) for ${recipientAddress}: ${usdtFormatted} USDT (tx: ${hash})`);

            return {
                success: true,
                transactionHash: hash,
                amountSponsored: usdtFormatted,
                sponsoredToken: 'USDT',
                feeCurrency: USDT_FEE_CURRENCY.address,
                gasEstimate: {
                    gasLimit: gasEstimate.gasLimit.toString(),
                    totalCost: gasEstimate.totalCostCELO,
                },
                message: `Gas sponsored successfully! ${usdtFormatted} USDT sent to your wallet.`,
            };
        } catch (error) {
            console.error('Error sponsoring gas with USDT:', error);

            // Record failed sponsorship attempt
            try {
                // @ts-ignore - Mongoose union type compatibility issue
                await GasSponsorship.create({
                    recipientAddress: recipientAddress.toLowerCase(),
                    amountCELO: '0',
                    transactionHash: 'failed',
                    status: 'failed',
                    sponsoredToken: 'USDT',
                    gasEstimate: {
                        gasLimit: gasEstimate.gasLimit.toString(),
                        maxFeePerGas: gasEstimate.maxFeePerGas.toString(),
                        maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas?.toString(),
                        totalCostCELO: gasEstimate.totalCostCELO,
                    },
                    userBalanceBefore: '0',
                    metadata: {
                        contractAddress: metadata.contractAddress,
                        functionName: metadata.functionName,
                        timestamp: new Date(),
                    },
                });
            } catch (dbError) {
                console.error('Failed to record failed USDT sponsorship:', dbError);
            }

            return {
                success: false,
                sponsoredToken: 'USDT',
                feeCurrency: USDT_FEE_CURRENCY.address,
                gasEstimate: {
                    gasLimit: gasEstimate.gasLimit.toString(),
                    totalCost: gasEstimate.totalCostCELO,
                },
                message: 'Failed to sponsor gas with USDT',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Get sponsorship history for a user
     */
    async getSponsorshipHistory(
        userAddress: Address,
        limit: number = 10
    ): Promise<IGasSponsorship[]> {
        await dbConnect();

        // @ts-ignore - Mongoose union type compatibility issue
        const sponsorships = await GasSponsorship.find({
            recipientAddress: userAddress.toLowerCase(),
        })
            .sort({ createdAt: -1 })
            .limit(limit);

        return sponsorships;
    }

    /**
     * Get sponsorship statistics
     */
    async getSponsorshipStats(days: number = 7): Promise<{
        totalSponsored: number;
        totalCount: number;
        uniqueUsers: number;
        averageAmount: number;
    }> {
        await dbConnect();

        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // @ts-ignore - Mongoose union type compatibility issue
        const stats = await GasSponsorship.aggregate([
            {
                $match: {
                    createdAt: { $gte: cutoffDate },
                    status: 'completed',
                },
            },
            {
                $group: {
                    _id: null,
                    totalSponsored: { $sum: { $toDouble: '$amountCELO' } },
                    count: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$recipientAddress' },
                },
            },
        ]);

        if (stats.length === 0) {
            return {
                totalSponsored: 0,
                totalCount: 0,
                uniqueUsers: 0,
                averageAmount: 0,
            };
        }

        const result = stats[0];
        return {
            totalSponsored: result.totalSponsored,
            totalCount: result.count,
            uniqueUsers: result.uniqueUsers.length,
            averageAmount: result.totalSponsored / result.count,
        };
    }

    /**
     * Get backend wallet balance
     */
    async getBackendWalletBalance(): Promise<{
        address: string;
        balance: string;
        balanceCELO: string;
        isLow: boolean;
    }> {
        const balance = await this.gasEstimator.getUserBalance(this.account.address);
        const balanceCELO = parseFloat(balance.balanceCELO);

        return {
            address: this.account.address,
            balance: balance.balanceWei.toString(),
            balanceCELO: balance.balanceCELO,
            isLow: balanceCELO < config.lowBalanceThreshold,
        };
    }
}

// Singleton instance
let gasSponsorshipService: GasSponsorshipService | null = null;

export function getGasSponsorshipService(): GasSponsorshipService {
    if (!gasSponsorshipService) {
        gasSponsorshipService = new GasSponsorshipService();
    }
    return gasSponsorshipService;
}
