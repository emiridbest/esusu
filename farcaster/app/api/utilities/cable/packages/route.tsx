import { NextRequest, NextResponse } from 'next/server';
import { getBillerByCountry } from '../../../../../services/utility/billerApi';

// Define the operator data interface
interface OperatorData {
  operatorId: number;
  name: string;
  bundle?: boolean;
  fixedAmounts?: Array<{
    amount: number;
    name?: string;
    description?: string;
    validity?: string;
  }>;
  localCurrencyCode: string;
}

export async function GET(request: NextRequest) {
  // Extract query parameters
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get('provider');
  const country = searchParams.get('country');

  if (!provider) {
    return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
  }

  if (!country) {
    return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
  }

  try {
    // Get detailed operator information including packages
    const operatorData = await getBillerByCountry(provider) as OperatorData;
    console.log('Operator Data:', operatorData);

    // Check if operator supports bundles for TV packages
    if (!operatorData.bundle) {
      return NextResponse.json([]);
    }
    const tvPackages = operatorData.fixedAmounts
      ? operatorData.fixedAmounts.map((amount) => ({
          id: `${operatorData.operatorId}-${amount.amount}`,
          name: amount.name || `${operatorData.name} ${formatLocalCurrency(amount.amount, operatorData.localCurrencyCode)}`,
          description: amount.description || `${operatorData.name} Subscription`,
          price: formatLocalCurrency(amount.amount, operatorData.localCurrencyCode),
          validity: amount.validity || "1 Month",
          packageType: "Standard"
        }))
      : [];

    return NextResponse.json(tvPackages);
  } catch (error: any) {
    console.error('Error fetching TV packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TV packages', details: error.message },
      { status: 500 }
    );
  }
}

// Helper to format currency amount with the correct currency symbol
function formatLocalCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is not supported
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}