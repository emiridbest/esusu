import { NextRequest, NextResponse } from 'next/server';
import { electricityPaymentService } from '../../../../../../backend/lib/services/electricityPaymentService';

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
        console.log(`Frontend API: Fetching electricity providers for country: ${sanitizedCountry}`);
        
        // Map country codes to ISO2 format that Reloadly expects
        const countryMapping: { [key: string]: string } = {
            'ghana': 'GH',
            'gh': 'GH',
            'kenya': 'KE', 
            'ke': 'KE',
            'uganda': 'UG',
            'ug': 'UG',
            'nigeria': 'NG',
            'ng': 'NG'
        };
        
        const isoCountryCode = countryMapping[sanitizedCountry] || sanitizedCountry.toUpperCase();
        console.log(`Frontend API: Mapped ${sanitizedCountry} to ${isoCountryCode}`);
        
        const providers = await electricityPaymentService.getProviders(isoCountryCode);
        
        // Transform the data to match our frontend requirements
        const formattedOperators: ProviderDetails[] = providers.map((provider) => ({
            id: provider.id,
            name: provider.name,
            serviceType: provider.serviceType,
            minLocalTransactionAmount: provider.minAmount,
            maxLocalTransactionAmount: provider.maxAmount,
            localTransactionCurrencyCode: provider.currency
        }));
        
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