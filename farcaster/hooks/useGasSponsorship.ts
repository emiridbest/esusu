import { useState, useCallback } from 'react';
import type { Abi, Address } from 'viem';

export interface GasSponsorParams {
    contractAddress: Address;
    abi: Abi;
    functionName: string;
    args?: any[];
    value?: bigint;
}

export interface GasEstimateResponse {
    success: boolean;
    gasEstimate?: {
        gasLimit: string;
        maxFeePerGas: string;
        maxPriorityFeePerGas: string;
        totalCostWei: string;
        totalCostCELO: string;
    };
    message?: string;
    error?: string;
}

export interface SponsorshipResponse {
    success: boolean;
    userHadSufficientGas: boolean;
    gasSponsored: boolean;
    amountSponsored?: string;
    sponsorshipTxHash?: string;
    gasEstimate: {
        gasLimit: string;
        totalCost: string;
    };
    message: string;
    error?: string;
}

export interface SponsorshipHistory {
    recipientAddress: string;
    amountCELO: string;
    transactionHash: string;
    status: 'pending' | 'completed' | 'failed';
    sponsoredTxHash?: string;
    createdAt: Date;
}

export function useGasSponsorship() {
    const [isChecking, setIsChecking] = useState(false);
    const [isEstimating, setIsEstimating] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    /**
     * Estimate gas for a transaction without sponsoring
     */
    const estimateGas = useCallback(
        async (
            userAddress: Address,
            params: GasSponsorParams
        ): Promise<GasEstimateResponse> => {
            setIsEstimating(true);
            setError(null);

            try {
                // Convert BigInt values in args to strings for JSON serialization
                const serializedArgs = (params.args || []).map(arg =>
                    typeof arg === 'bigint' ? arg.toString() : arg
                );

                const response = await fetch('/api/gas/estimate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userAddress,
                        contractAddress: params.contractAddress,
                        abi: params.abi,
                        functionName: params.functionName,
                        args: serializedArgs,
                        value: params.value?.toString(),
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to estimate gas');
                }

                return data;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Unknown error');
                setError(error);
                return {
                    success: false,
                    error: error.message,
                };
            } finally {
                setIsEstimating(false);
            }
        },
        []
    );

    /**
     * Check if user needs gas and sponsor if necessary
     */
    const checkAndSponsor = useCallback(
        async (
            userAddress: Address,
            params: GasSponsorParams
        ): Promise<SponsorshipResponse> => {
            setIsChecking(true);
            setError(null);

            try {
                // Convert BigInt values in args to strings for JSON serialization
                const serializedArgs = (params.args || []).map(arg =>
                    typeof arg === 'bigint' ? arg.toString() : arg
                );

                const response = await fetch('/api/gas/check-and-sponsor', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userAddress,
                        contractAddress: params.contractAddress,
                        abi: params.abi,
                        functionName: params.functionName,
                        args: serializedArgs,
                        value: params.value?.toString(),
                    }),
                });

                const data = await response.json();

                // Handle rate limiting
                if (response.status === 429) {
                    throw new Error(data.message || 'Rate limit exceeded. Please try again later.');
                }

                // Handle service unavailable
                if (response.status === 503) {
                    throw new Error(
                        data.message || 'Gas sponsorship service temporarily unavailable.'
                    );
                }

                if (!response.ok && response.status !== 400) {
                    throw new Error(data.error || 'Failed to check and sponsor gas');
                }

                return data;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Unknown error');
                setError(error);
                return {
                    success: false,
                    userHadSufficientGas: false,
                    gasSponsored: false,
                    gasEstimate: {
                        gasLimit: '0',
                        totalCost: '0',
                    },
                    message: error.message,
                    error: error.message,
                };
            } finally {
                setIsChecking(false);
            }
        },
        []
    );

    /**
     * Get sponsorship history for current user
     */
    const getSponsorshipHistory = useCallback(
        async (
            userAddress: Address,
            limit: number = 10
        ): Promise<SponsorshipHistory[]> => {
            try {
                const response = await fetch(
                    `/api/gas/check-and-sponsor?userAddress=${userAddress}&limit=${limit}`
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to get sponsorship history');
                }

                return data.history || [];
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Unknown error');
                setError(error);
                return [];
            }
        },
        []
    );

    /**
     * Get current gas prices
     */
    const getCurrentGasPrices = useCallback(async () => {
        try {
            const response = await fetch('/api/gas/estimate');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get gas prices');
            }

            return data.gasPrices;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            return null;
        }
    }, []);

    return {
        // Actions
        estimateGas,
        checkAndSponsor,
        getSponsorshipHistory,
        getCurrentGasPrices,

        // State
        isChecking,
        isEstimating,
        error,
    };
}

export default useGasSponsorship;
