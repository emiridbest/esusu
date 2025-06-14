import { NextRequest, NextResponse } from 'next/server';
import { getOperatorsByCountry } from '../../../../../services/utility/api';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get('country');

    if (!country) {
        return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
    }

    try {
        const operators = await getOperatorsByCountry(country, false, false);

        if (!Array.isArray(operators)) {
            console.error('Invalid response format from API:', operators);
            return NextResponse.json({
                error: 'Invalid response from operator service',
                details: 'Expected an array of operators'
            }, { status: 500 });
        }
        
        // Filter out data and data bundle operators
        const filteredOperators = operators.filter((op: any) => {
            const operatorName = (op.name || '').toLowerCase();
            return !operatorName.includes('data') && 
                         !operatorName.includes('bundle') &&
                         !operatorName.includes('internet');
        });
        
        // Transform the data to match our frontend requirements
        const formattedOperators = filteredOperators.map((op: any) => ({
            id: op.operatorId?.toString() || (op.id || '').toString(),
            name: op.name || 'Unknown Provider',
            logoUrls: op.logoUrls || [],
        }));

        return NextResponse.json(formattedOperators);
    } catch (error: any) {
        console.error('Error fetching operators:', error);
        return NextResponse.json(
            { error: 'Failed to fetch mobile providers', details: error.message },
            { status: 500 }
        );
    }
}