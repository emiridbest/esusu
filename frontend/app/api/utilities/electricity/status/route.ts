import { NextRequest, NextResponse } from 'next/server';
import { electricityPaymentService } from '@esusu/backend/lib/services/electricityPaymentService';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const transactionRef = searchParams.get('transactionRef');
        const country = searchParams.get('country');

        if (!transactionRef || !country) {
            return NextResponse.json(
                { error: 'Missing required parameters: transactionRef, country' },
                { status: 400 }
            );
        }

        console.log(`Checking electricity payment status:`, { transactionRef, country });

        const statusResult = await electricityPaymentService.getTransactionStatus(
            country.trim().toLowerCase(),
            transactionRef
        );

        return NextResponse.json({
            status: statusResult.status,
            transactionRef: statusResult.transactionRef,
            amount: statusResult.amount,
            responseDescription: statusResult.responseDescription,
            completedAt: statusResult.completedAt
        });
    } catch (error: any) {
        console.error('Error checking electricity payment status:', error);
        return NextResponse.json(
            { 
                status: 'failed',
                error: 'Status check service temporarily unavailable',
                details: error.message 
            },
            { status: 500 }
        );
    }
}
