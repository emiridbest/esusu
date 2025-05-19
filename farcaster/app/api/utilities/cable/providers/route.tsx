import { NextRequest, NextResponse } from 'next/server';
import { getBillerByCountry } from '../../../../../services/utility/billerApi';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const country = searchParams.get('country');

  if (!country) {
    return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
  }
  try {
    // Ensure country code is properly formatted before passing to the API
    const sanitizedCountry = country.trim().toLowerCase();
    const operators = await getBillerByCountry(sanitizedCountry);
    // Ensure operators is an array before filtering
    if (!Array.isArray(operators)) {
      return NextResponse.json({ error: 'Invalid response from operator service' }, { status: 500 });
    }
    
    // Filter to only include TV/cable operators
    const cableOperators = operators.filter((op: any) => 
      op.operatorType === 'CABLE' || op.operatorType === 'TV' ) 
    console.log('Filtered cable operators:', cableOperators);
    
    console.log('Filtered cable operators:', operators);
    // Transform the data to match our frontend requirements
    const formattedOperators = cableOperators.map((op: any) => ({
      id: op.operatorId.toString(),
      name: op.name,
      logoUrls: op.logoUrls || [],
      supportsPackages: op.bundle || false
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