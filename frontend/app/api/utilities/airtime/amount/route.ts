import { NextRequest, NextResponse } from 'next/server';
import { getOperator } from '@/services/utility/api';

// Interface for operator details
interface OperatorDetails {
    operatorId: number;
    localMinAmount?: number;
    localMaxAmount?: number;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    const country = searchParams.get('country');
    if (!provider || !country) {
        return NextResponse.json({ error: 'Provider ID and country code are required' }, { status: 400 });
    }

    try {
        const operatorId = parseInt(provider);
        const operatorDetails = await getOperator(operatorId) as OperatorDetails;
        if (!operatorDetails) {
            return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
        }

        // Extract only localMinAmount and localMaxAmount
        const amountRange = {
            localMinAmount: operatorDetails.localMinAmount || null,
            localMaxAmount: operatorDetails.localMaxAmount || null
        };
        
        return NextResponse.json(amountRange);
    } catch (error: any) {
        console.error('Error fetching amount range:', error);
        return NextResponse.json(
            { error: 'Failed to fetch amount range', details: error.message },
            { status: 500 }
        );
    }
}
