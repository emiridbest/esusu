import { NextRequest, NextResponse } from 'next/server';
import { getBillerByCountry } from '../../../../../services/utility/billerApi';

interface ProviderDetails {
    id: string;
    name: string;
    serviceType: string;
    minLocalTransactionAmount: number;
    maxLocalTransactionAmount: number;
    localTransactionCurrencyCode: string;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const country = searchParams.get('country');
    if (!country) {
        return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
    }

    try {
        // Ensure country code is properly formatted before passing to the API
        const sanitizedCountry = country.trim().toLowerCase();
        console.log(`Fetching providers for country: ${sanitizedCountry}`);
        
        const response: any = await getBillerByCountry(sanitizedCountry);
        
        // Check if response exists and is properly formatted
        if (!response) {
            throw new Error('Empty response from biller API');
        }

        // Extract operators from the paginated response structure
        const operators = response.content || 
                         (response.data?.content) || 
                         (Array.isArray(response) ? response : []);
        
        // Filter to include only electricity operators
        const electricityOperators = operators.filter((op: any) => 
            op.serviceType === 'ELECTRICITY' || 
            op.operatorType === 'ELECTRICITY' ||
            true // Include all operators for now**
        );        // Transform the data to match our frontend requirements
        const formattedOperators: ProviderDetails[] = electricityOperators.map((op: any) => ({
            id: (op.operatorId || op.id || '').toString(),
            name: op.name || 'Unknown Provider',
            serviceType: op.serviceType || 'ELECTRICITY',
            minLocalTransactionAmount: op.minLocalTransactionAmount || 0,
            maxLocalTransactionAmount: op.maxLocalTransactionAmount || 0,
            localTransactionCurrencyCode: op.localTransactionCurrencyCode || ''
        }));
        
        console.log(`Found ${formattedOperators.length} electricity providers for ${sanitizedCountry}`);
        return NextResponse.json(formattedOperators);
    } catch (error: any) {
        console.error('Error fetching electricity providers:', error);
        return NextResponse.json(
            { 
                error: 'Failed to fetch electricity providers', 
                details: error.message,
                country: country 
            },
            { status: 500 }
        );
    }
}