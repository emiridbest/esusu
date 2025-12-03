import { NextRequest, NextResponse } from 'next/server';
import { getGasEstimationService } from '@esusu/backend/lib/services/gasEstimationService';
import type { Address, Abi } from 'viem';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userAddress, contractAddress, abi, functionName, args, value } = body;

        // Validate required fields
        if (!userAddress || !contractAddress || !abi || !functionName) {
            return NextResponse.json(
                { error: 'Missing required fields: userAddress, contractAddress, abi, functionName' },
                { status: 400 }
            );
        }

        // Validate addresses
        if (!userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            return NextResponse.json(
                { error: 'Invalid user address format' },
                { status: 400 }
            );
        }

        if (!contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            return NextResponse.json(
                { error: 'Invalid contract address format' },
                { status: 400 }
            );
        }

        // Get gas estimation service
        const gasEstimator = getGasEstimationService();

        // Estimate gas
        const estimate = await gasEstimator.estimateTransactionGas({
            userAddress: userAddress as Address,
            contractAddress: contractAddress as Address,
            abi: abi as Abi,
            functionName,
            args: args || [],
            value: value ? BigInt(value) : undefined,
        });

        // Return gas estimate
        return NextResponse.json({
            success: true,
            gasEstimate: {
                gasLimit: estimate.gasLimit.toString(),
                maxFeePerGas: estimate.maxFeePerGas.toString(),
                maxPriorityFeePerGas: estimate.maxPriorityFeePerGas.toString(),
                totalCostWei: estimate.totalCostWei.toString(),
                totalCostCELO: estimate.totalCostCELO,
            },
            message: 'Gas estimated successfully',
        });
    } catch (error: any) {
        console.error('Gas estimation error:', error);

        // Handle specific error cases
        if (error.message?.includes('execution reverted')) {
            return NextResponse.json(
                {
                    error: 'Transaction would revert',
                    details: error.message,
                    suggestion: 'Please check your transaction parameters and contract state',
                },
                { status: 400 }
            );
        }

        if (error.message?.includes('insufficient funds')) {
            return NextResponse.json(
                {
                    error: 'Insufficient funds for transaction',
                    details: error.message,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: 'Failed to estimate gas',
                details: error.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// GET endpoint to get current gas prices
export async function GET(req: NextRequest) {
    try {
        const gasEstimator = getGasEstimationService();
        const gasPrices = await gasEstimator.getCurrentGasPrices();

        return NextResponse.json({
            success: true,
            gasPrices: {
                baseFeePerGas: gasPrices.baseFeePerGas.toString(),
                maxPriorityFeePerGas: gasPrices.maxPriorityFeePerGas.toString(),
                maxFeePerGas: gasPrices.maxFeePerGas.toString(),
            },
        });
    } catch (error: any) {
        console.error('Error getting gas prices:', error);
        return NextResponse.json(
            {
                error: 'Failed to get gas prices',
                details: error.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}
