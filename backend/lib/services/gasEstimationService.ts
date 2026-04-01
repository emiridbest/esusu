import { createPublicClient, http, parseAbi, type Abi, type Address } from 'viem';
import { celo } from 'viem/chains';

// USDT on Celo — whitelisted as a gas fee currency
// The token address is used for balance checks; the adapter address is what
// must be passed as `feeCurrency` in a transaction (required for non-18-decimal tokens).
const USDT_FEE_CURRENCY = {
    address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as Address,        // token (for balanceOf)
    adapterAddress: '0x0B2f9835eCF98A7e3c709fded49052b259110E04' as Address,  // fee currency adapter (for feeCurrency field)
    decimals: 6,
    token: 'USDT',
};

// Environment configuration with defaults
const config = {
    rpcUrl: process.env.CELO_RPC_URL || 'https://forno.celo.org',
    gasBufferPercent: 20, // 20% safety margin
};

export interface GasEstimateParams {
    userAddress: Address;
    contractAddress: Address;
    abi: Abi;
    functionName: string;
    args: any[];
    value?: bigint;
}

export interface GasEstimateResult {
    gasLimit: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    totalCostWei: bigint;
    totalCostCELO: string;
    estimatedUSD?: string;
}

export class GasEstimationService {
    private publicClient: any;

    constructor() {
        this.publicClient = createPublicClient({
            chain: celo,
            transport: http(config.rpcUrl),
        });
    }

    /**
     * Estimate gas for a contract transaction
     * Simulates the transaction and returns accurate gas estimates
     */
    async estimateTransactionGas(params: GasEstimateParams): Promise<GasEstimateResult> {
        try {
            // Step 1: Simulate the contract call to get gas estimate
            const gasLimit = await this.publicClient.estimateContractGas({
                address: params.contractAddress,
                abi: params.abi,
                functionName: params.functionName,
                args: params.args,
                account: params.userAddress,
                value: params.value,
            });

            // Step 2: Get current gas price data (EIP-1559)
            const block = await this.publicClient.getBlock({ blockTag: 'latest' });
            const baseFeePerGas = block.baseFeePerGas || BigInt(0);

            // Step 3: Estimate max priority fee (tip to miners)
            const maxPriorityFeePerGas = await this.publicClient.estimateMaxPriorityFeePerGas();

            // Step 4: Calculate max fee per gas (base fee * 2 + priority fee for buffer)
            const maxFeePerGas = baseFeePerGas * BigInt(2) + maxPriorityFeePerGas;

            // Step 5: Add buffer to gas limit (20% safety margin)
            const bufferedGasLimit = this.addBuffer(gasLimit);

            // Step 6: Calculate total cost
            const totalCostWei = bufferedGasLimit * maxFeePerGas;
            const totalCostCELO = this.weiToCELO(totalCostWei);

            return {
                gasLimit: bufferedGasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas,
                totalCostWei,
                totalCostCELO,
            };
        } catch (error) {
            console.error('Gas estimation error:', error);
            throw new Error(
                `Failed to estimate gas: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Get user's current CELO balance
     */
    async getUserBalance(address: Address): Promise<{
        balanceWei: bigint;
        balanceCELO: string;
    }> {
        try {
            const balanceWei = await this.publicClient.getBalance({
                address,
            });

            return {
                balanceWei,
                balanceCELO: this.weiToCELO(balanceWei),
            };
        } catch (error) {
            console.error('Error getting user balance:', error);
            throw new Error(
                `Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Get user's ERC-20 token balance
     */
    async getERC20Balance(userAddress: Address, tokenAddress: Address, decimals: number): Promise<bigint> {
        try {
            const erc20Abi = parseAbi(['function balanceOf(address) view returns (uint256)']);
            const balance = await this.publicClient.readContract({
                address: tokenAddress,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [userAddress],
            });
            return balance as bigint;
        } catch (error) {
            console.error(`Error getting ERC-20 balance for ${tokenAddress}:`, error);
            return BigInt(0);
        }
    }

    /**
     * Check if user has a usable fee currency token (USDT) to pay for gas
     * On Celo, whitelisted tokens can be used to pay gas via the feeCurrency field.
     */
    async findUsableFeeCurrency(
        userAddress: Address,
        requiredGasWei: bigint
    ): Promise<{ token: string; address: Address; decimals: number } | null> {
        try {
            const usdtBalance = await this.getERC20Balance(
                userAddress,
                USDT_FEE_CURRENCY.address,
                USDT_FEE_CURRENCY.decimals
            );
            // Convert requiredGasWei (18 decimals, CELO-denominated) to a rough USDT equivalent.
            // Use a conservative fixed rate: 1 CELO ≈ $0.50, USDT ≈ $1. So gasInUSDT ≈ gasCELO * 0.5.
            // For safety we just compare raw balance to a generous threshold — gas costs on Celo
            // are tiny ($0.001), so even a small USDT balance (>= 0.01 USDT) is more than enough.
            const minUsdtForGas = BigInt(10_000); // 0.01 USDT (6 decimals)
            if (usdtBalance >= minUsdtForGas) {
                return {
                    token: USDT_FEE_CURRENCY.token,
                    address: USDT_FEE_CURRENCY.adapterAddress,
                    decimals: USDT_FEE_CURRENCY.decimals,
                };
            }
            return null;
        } catch (error) {
            console.error('Error finding usable fee currency:', error);
            return null;
        }
    }

    /**
     * Check if user has sufficient balance for gas
     * When checkFeeCurrency is true, also checks if USDT can be used as an alternative.
     */
    async checkSufficientGas(
        userAddress: Address,
        requiredGasWei: bigint,
        checkFeeCurrency: boolean = false
    ): Promise<{
        hasSufficient: boolean;
        currentBalance: bigint;
        shortfall: bigint;
        feeCurrency?: { token: string; address: Address; decimals: number };
    }> {
        const { balanceWei } = await this.getUserBalance(userAddress);
        const hasSufficient = balanceWei >= requiredGasWei;
        const shortfall = hasSufficient ? BigInt(0) : requiredGasWei - balanceWei;

        // If user doesn't have enough CELO and we should check for fee currency alternatives
        if (!hasSufficient && checkFeeCurrency) {
            const feeCurrency = await this.findUsableFeeCurrency(userAddress, requiredGasWei);
            if (feeCurrency) {
                return {
                    hasSufficient: true,
                    currentBalance: balanceWei,
                    shortfall: BigInt(0),
                    feeCurrency,
                };
            }
        }

        return {
            hasSufficient,
            currentBalance: balanceWei,
            shortfall,
        };
    }

    /**
     * Add buffer percentage to a value
     */
    private addBuffer(value: bigint): bigint {
        return (value * BigInt(100 + config.gasBufferPercent)) / BigInt(100);
    }

    /**
     * Convert wei to CELO (18 decimals)
     */
    private weiToCELO(wei: bigint): string {
        const celoValue = Number(wei) / 1e18;
        return celoValue.toFixed(18);
    }

    /**
     * Convert CELO to wei
     */
    public celoToWei(celo: string): bigint {
        const celoNum = parseFloat(celo);
        return BigInt(Math.floor(celoNum * 1e18));
    }

    /**
     * Estimate gas for multiple transactions (batch)
     */
    async estimateBatchGas(
        transactions: GasEstimateParams[]
    ): Promise<GasEstimateResult[]> {
        const estimates = await Promise.all(
            transactions.map((tx) => this.estimateTransactionGas(tx))
        );
        return estimates;
    }

    /**
     * Get current gas prices without simulating a transaction
     */
    async getCurrentGasPrices(): Promise<{
        baseFeePerGas: bigint;
        maxPriorityFeePerGas: bigint;
        maxFeePerGas: bigint;
    }> {
        try {
            const block = await this.publicClient.getBlock({ blockTag: 'latest' });
            const baseFeePerGas = block.baseFeePerGas || BigInt(0);
            const maxPriorityFeePerGas = await this.publicClient.estimateMaxPriorityFeePerGas();
            const maxFeePerGas = baseFeePerGas * BigInt(2) + maxPriorityFeePerGas;

            return {
                baseFeePerGas,
                maxPriorityFeePerGas,
                maxFeePerGas,
            };
        } catch (error) {
            console.error('Error getting gas prices:', error);
            throw new Error(
                `Failed to get gas prices: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}

// Singleton instance
let gasEstimationService: GasEstimationService | null = null;

export function getGasEstimationService(): GasEstimationService {
    if (!gasEstimationService) {
        gasEstimationService = new GasEstimationService();
    }
    return gasEstimationService;
}
