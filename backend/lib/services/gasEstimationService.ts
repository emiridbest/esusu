import { createPublicClient, http, type Abi, type Address } from 'viem';
import { celo } from 'viem/chains';

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
     * Check if user has sufficient balance for gas
     */
    async checkSufficientGas(
        userAddress: Address,
        requiredGasWei: bigint
    ): Promise<{
        hasSufficient: boolean;
        currentBalance: bigint;
        shortfall: bigint;
    }> {
        const { balanceWei } = await this.getUserBalance(userAddress);
        const hasSufficient = balanceWei >= requiredGasWei;
        const shortfall = hasSufficient ? BigInt(0) : requiredGasWei - balanceWei;

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
