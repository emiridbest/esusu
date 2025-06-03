import { NextRequest, NextResponse } from 'next/server';
import { getBillerByCountry } from '@/services/utility/billerApi';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const country = searchParams.get('country');

  if (!country) {
    return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
  }  try {
    // Ensure country code is properly formatted before passing to the API
    const sanitizedCountry = country.trim().toLowerCase();
    console.log(`Fetching cable providers for country: ${sanitizedCountry}`);
    
    const response: any = await getBillerByCountry(sanitizedCountry);
    
    // Check if response exists and is properly formatted
    if (!response) {
      return NextResponse.json({ error: 'Empty response from biller API' }, { status: 500 });
    }
    
    // Extract operators from the paginated response structure 
    const operators = response.content || 
                     (response.data?.content) || 
                     (Array.isArray(response) ? response : []);
    
    // Filter to only include TV/cable operators
    const cableOperators = operators.filter((op: any) => 
      op.serviceType === 'CABLE' || op.serviceType === 'TV' || 
      op.operatorType === 'CABLE' || op.operatorType === 'TV'
    );    console.log('Filtered cable operators:', cableOperators);
    
    // Transform the data to match our frontend requirements
    const formattedOperators = cableOperators.map((op: any) => ({
      id: (op.operatorId || op.id || '').toString(),
      name: op.name || 'Unknown Provider',
      logoUrls: op.logoUrls || [],
      supportsPackages: op.bundle || false,
      minAmount: op.minLocalTransactionAmount || 0,
      maxAmount: op.maxLocalTransactionAmount || 0,
      currencyCode: op.localTransactionCurrencyCode || ''
    }));

    return NextResponse.json(formattedOperators);
  } catch (error: any) {
    console.error('Error fetching cable providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cable TV providers', details: error.message },
      { status: 500 }
    );
  }
}