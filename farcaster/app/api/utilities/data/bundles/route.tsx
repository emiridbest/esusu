import { NextRequest, NextResponse } from 'next/server';
import { getOperator } from '../../../../../services/utility/api';

// Interface for operator details
interface OperatorDetails {
  operatorId: number;
  data?: boolean;
  localFixedAmountsDescriptions?: any[];
  dataBundles?: any[];
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

    // Check if this operator supports data bundles
    if (!operatorDetails.data) {
      return NextResponse.json([]); 
    }

    // Get the bundles for this operator
    const bundles: any = operatorDetails.localFixedAmountsDescriptions;

    let formattedBundles: { id: string; name: string; price: string; description: string; dataAmount: string; validity: string }[] = [];

    // Check if bundles is an array
    if (Array.isArray(bundles)) {
      formattedBundles = bundles.map((bundle: any) => ({
        id: bundle.bundleId?.toString() || `${operatorDetails.operatorId}-${bundle.amount}`,
        name: bundle.name || `${bundle.dataAmount || ''} ${bundle.validity || ''}`,
        price: bundle.amount?.toString() || '',
        description: bundle.description || '',
        dataAmount: bundle.dataAmount || '',
        validity: bundle.validity || '30 Days'
      }));
    } 
    // Check if bundles is an object
    else if (bundles && typeof bundles === 'object') {
      formattedBundles = Object.entries(bundles).map(([price, description]) => ({
        id: `${operatorDetails.operatorId}-${price}`,
        name: description as string,
        price: price,
        description: description as string,
        dataAmount: extractDataAmount(description as string),
        validity: extractValidity(description as string)
      }));
    }
    
    return NextResponse.json(formattedBundles);
  } catch (error: any) {
    console.error('Error fetching data bundles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data bundles', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to extract data amount from bundle description
function extractDataAmount(description: string): string {
  const dataMatch = description.match(/(\d+(?:\.\d+)?(?:MB|GB|TB))/i);
  return dataMatch ? dataMatch[0] : '';
}

// Helper function to extract validity from bundle description
function extractValidity(description: string): string {
  const validityMatch = description.match(/\((\d+\s*days?)\)/i);
  return validityMatch ? validityMatch[1] : '30 Days';
}