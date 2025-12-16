import { NextRequest, NextResponse } from 'next/server';
import { getGasSponsorshipService } from '@esusu/backend/lib/services/gasSponsorshipService';
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

        // Get gas sponsorship service
        const sponsorshipService = getGasSponsorshipService();

        // Check and sponsor gas if needed
        const result = await sponsorshipService.checkAndSponsorGas({
            userAddress: userAddress as Address,
            contractAddress: contractAddress as Address,
            abi: abi as Abi,
            functionName,
            args: args || [],
            value: value ? BigInt(value) : undefined,
        });

        // If sponsorship failed due to rate limiting, return 429
        if (!result.success && result.error?.includes('limit')) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error,
                    message: result.message,
                    gasEstimate: result.gasEstimate,
                },
                { status: 429 }
            );
        }

        // If sponsorship failed due to backend wallet issues, return 503
        if (!result.success && result.error?.includes('unavailable')) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error,
                    message: result.message,
                    gasEstimate: result.gasEstimate,
                },
                { status: 503 }
            );
        }

        // Return result
        const responseData = {
            success: result.success,
            userHadSufficientGas: !result.amountSponsored,
            gasSponsored: !!result.amountSponsored,
            amountSponsored: result.amountSponsored,
            sponsorshipTxHash: result.transactionHash,
            gasEstimate: result.gasEstimate,
            message: result.message,
        };

        return NextResponse.json(responseData, {
            status: result.success ? 200 : 400,
        });
    } catch (error: any) {
        console.error('Gas sponsorship error:', error);
        console.error('Error stack:', error.stack);

        // Handle specific error cases
        if (error.message?.includes('execution reverted')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Transaction simulation failed',
                    details: error.message,
                    suggestion: 'Please check your transaction parameters and contract state',
                },
                { status: 400 }
            );
        }

        if (error.message?.includes('BACKEND_WALLET_PRIVATE_KEY')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Gas sponsorship service not configured',
                    details: error.message,
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to check and sponsor gas',
                details: error.stack || error.toString(),
                userHadSufficientGas: false,
                gasSponsored: false,
                gasEstimate: {
                    gasLimit: '0',
                    totalCost: '0'
                },
                message: error.message || 'Failed to check and sponsor gas',
            },
            { status: 500 }
        );
    }
}

// GET endpoint to get sponsorship history for a user
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userAddress = searchParams.get('userAddress');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!userAddress) {
            return NextResponse.json(
                { error: 'Missing userAddress parameter' },
                { status: 400 }
            );
        }

        if (!userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
            return NextResponse.json(
                { error: 'Invalid user address format' },
                { status: 400 }
            );
        }

        const sponsorshipService = getGasSponsorshipService();
        const history = await sponsorshipService.getSponsorshipHistory(
            userAddress as Address,
            limit
        );

        return NextResponse.json({
            success: true,
            history,
        });
    } catch (error: any) {
        console.error('Error getting sponsorship history:', error);
        return NextResponse.json(
            {
                error: 'Failed to get sponsorship history',
                details: error.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}
