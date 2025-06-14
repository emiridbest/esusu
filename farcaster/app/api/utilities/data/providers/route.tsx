import { NextRequest, NextResponse } from 'next/server';
import { getOperatorsByCountry } from '../../../../../services/utility/api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const country = searchParams.get('country');
  if (!country) {
    return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
  }
  try {
    // Ensure country code is properly formatted
    const sanitizedCountry = country.trim().toLowerCase();

    const operators: any = await getOperatorsByCountry(sanitizedCountry, true, true);

    if (!Array.isArray(operators)) {
      console.error('Invalid response format from API:', operators);
      return NextResponse.json({
        error: 'Invalid response from operator service',
        details: 'Expected an array of operators'
      }, { status: 500 });
    }
    // Transform the data to match our frontend requirements
    const formattedOperators = operators.map((op: any) => ({
      id: op.operatorId?.toString() || (op.id || '').toString(),
      name: op.name || 'Unknown Provider',
      logoUrls: op.logoUrls || [],
      supportsData: op.data || false,
      supportsBundles: op.bundle || false
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