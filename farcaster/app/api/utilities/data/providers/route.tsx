import { NextRequest, NextResponse } from 'next/server';
import { getOperatorsByCountry } from '../../../../../services/utility/api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const country = searchParams.get('country');

  if (!country) {
    return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
  }

  try {
    const operators: any  = await getOperatorsByCountry(country);
    

    // Transform the data to match our frontend requirements
    const formattedOperators = operators.map((op: any) => ({
      id: op.operatorId.toString(),
      name: op.name,
      logoUrls: op.logoUrls || [],
      supportsData: op.data,
      supportsBundles: op.bundle
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