import { NextRequest, NextResponse } from 'next/server';
// Base URLs from environment variables
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL;
const SANDBOX_API_URL = process.env.NEXT_PUBLIC_SANDBOX_API_URL;
const PRODUCTION_API_URL = process.env.NEXT_PUBLIC_API_URL;

// Determine API URL based on environment
const isSandbox = process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';
const API_URL = isSandbox ? SANDBOX_API_URL : PRODUCTION_API_URL;

// Log API URL configuration on initialization for debugging

// Use the native fetch API's RequestInit interface
type RequestInit = Parameters<typeof fetch>[1];


// Cache for token and rates to minimize API calls
const tokenCache = {
  token: '',
  expiresAt: 0
};

/**
 * Gets an OAuth 2.0 access token from Reloadly
 * Implements caching to avoid unnecessary token requests
 */
async function getAccessToken(): Promise<string> {
  // Check if token is still valid
  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {

    return tokenCache.token;
  }

  try {
    const clientId = process.env.NEXT_CLIENT_ID;
    const clientSecret = process.env.NEXT_CLIENT_SECRET;
    const isSandbox = process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';

    if (!clientId || !clientSecret) {
      throw new Error('Reloadly API credentials not configured');
    }

    // Use regular API audience - make sure we have the full URL without truncation
    const audience = isSandbox
      ? process.env.NEXT_PUBLIC_SANDBOX_API_URL
      : process.env.NEXT_PUBLIC_API_URL;

    if (!audience) {
      throw new Error('API audience URL not configured');
    }



    if (!AUTH_URL) {
      throw new Error('Authentication URL not configured');
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        audience: audience
      })
    };

    const response = await fetch(AUTH_URL, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Authentication error response:', errorText);
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      access_token: string;
      expires_in?: number;
    };

    // Store token with expiration
    const expiresIn = data.expires_in || 3600;
    tokenCache.token = data.access_token;
    tokenCache.expiresAt = Date.now() + (expiresIn * 1000) - 60000; // Subtract 1 minute for safety

    return tokenCache.token;
  } catch (error) {
    console.error('Error getting Reloadly access token:', error);
    throw new Error('Failed to authenticate with Reloadly API');
  }
}

/**
 * Creates authenticated request headers for Reloadly API
 */
async function getAuthHeaders() {
  const token = await getAccessToken();
  const acceptHeader = process.env.NEXT_PUBLIC_ACCEPT_HEADER || 'application/json';

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': acceptHeader
  };
}

/**
 * Makes an authenticated API request 
 * @param endpoint API endpoint
 * @param options Fetch options
 */
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const headers = await getAuthHeaders();
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: new Headers({
      ...headers,
      ...(typeof options.headers === 'object' ? options.headers : {})
    })
  });

  if (!response.ok) {
    // Try to parse error response
    try {
      const errorData = await response.json();
      console.error('API request failed with error data:', errorData);
      const errorMessage = errorData.message || `API request failed: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    } catch (parseError) {
      // If parsing fails, throw basic error
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
  }

  return response.json();
}

// Interface for operator details - flexible to handle various API response formats
interface OperatorDetails {
  operatorId: number;
  name?: string;
  data?: boolean;
  localFixedAmountsDescriptions?: any[] | any;
  dataBundles?: any[];
  fixedAmounts?: any[];
  fixedAmountsDescriptions?: any[];
  [key: string]: any; // Allow additional fields for flexibility
}
/**
 * Gets details of a specific operator
 * @param operatorId The ID of the operator
 */
async function getOperator(operatorId: number) {
  try {
    return await apiRequest(`/operators/${operatorId}`);
  } catch (error) {
    console.error(`Error fetching operator ${operatorId}:`, error);
    throw error;
  }
}

/**
 * Gets data bundles for a specific operator using dedicated endpoint
 * @param operatorId The ID of the operator
 */
async function getDataBundles(operatorId: number) {
  try {
    return await apiRequest(`/operators/${operatorId}/data-bundles`);
  } catch (error) {
    console.error(`Error fetching data bundles for operator ${operatorId}:`, error);
    // Don't throw error here, we'll fall back to operator details
    return null;
  }
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
    
    // First try the dedicated data bundles endpoint
    const dataBundlesResponse = await getDataBundles(operatorId);
    
    if (dataBundlesResponse && Array.isArray(dataBundlesResponse) && dataBundlesResponse.length > 0) {
      console.log('Using dedicated data bundles endpoint:', dataBundlesResponse.length, 'bundles found');
      
      const formattedBundles = dataBundlesResponse.map((bundle: any) => ({
        id: bundle.bundleId?.toString() || bundle.id?.toString() || `${operatorId}-${bundle.amount || bundle.price}`,
        name: bundle.name || bundle.title || `${bundle.dataAmount || bundle.data || ''} ${bundle.validity || bundle.validityPeriod || ''}`,
        price: (bundle.amount || bundle.price || bundle.localAmount)?.toString() || '',
        description: bundle.description || bundle.name || bundle.title || '',
        dataAmount: bundle.dataAmount || bundle.data || extractDataAmount(bundle.description || bundle.name || ''),
        validity: bundle.validity || bundle.validityPeriod || extractValidity(bundle.description || bundle.name || '') || '30 Days'
      }));
      
      console.log('Formatted bundles from dedicated endpoint:', formattedBundles.length, 'bundles');
      return NextResponse.json(formattedBundles);
    }
    
    // Fallback to operator details endpoint
    const operatorDetails = await getOperator(operatorId) as OperatorDetails;
    
    console.log('Full operator response:', JSON.stringify(operatorDetails, null, 2));
    
    if (!operatorDetails) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
    }

    // Check if this operator supports data bundles
    if (!operatorDetails.data) {
      console.log('Operator does not support data:', operatorDetails.operatorId);
      return NextResponse.json([]);
    }

    // Try multiple sources for bundles data in priority order
    let bundles: any = null;
    let bundlesSource = '';
    
    // Debug logging for fixedAmountsDescriptions
    console.log('fixedAmountsDescriptions exists:', !!operatorDetails.fixedAmountsDescriptions);
    console.log('fixedAmountsDescriptions type:', typeof operatorDetails.fixedAmountsDescriptions);
    console.log('fixedAmountsDescriptions keys:', operatorDetails.fixedAmountsDescriptions ? Object.keys(operatorDetails.fixedAmountsDescriptions) : 'null/undefined');
    
    // 1. Try fixedAmountsDescriptions as object (PRIORITY - contains descriptions!)
    if (operatorDetails.fixedAmountsDescriptions && typeof operatorDetails.fixedAmountsDescriptions === 'object' && !Array.isArray(operatorDetails.fixedAmountsDescriptions) && Object.keys(operatorDetails.fixedAmountsDescriptions).length > 0) {
      bundles = operatorDetails.fixedAmountsDescriptions;
      bundlesSource = 'fixedAmountsDescriptions-object';
      console.log('Using fixedAmountsDescriptions as object:', Object.keys(bundles).length, 'entries found');
    }
    // 2. Try dataBundles field (newer API format)
    else if (operatorDetails.dataBundles && Array.isArray(operatorDetails.dataBundles) && operatorDetails.dataBundles.length > 0) {
      bundles = operatorDetails.dataBundles;
      bundlesSource = 'dataBundles';
      console.log('Using dataBundles field:', bundles.length, 'bundles found');
    }
    // 3. Try localFixedAmountsDescriptions as array
    else if (Array.isArray(operatorDetails.localFixedAmountsDescriptions) && operatorDetails.localFixedAmountsDescriptions.length > 0) {
      bundles = operatorDetails.localFixedAmountsDescriptions;
      bundlesSource = 'localFixedAmountsDescriptions-array';
      console.log('Using localFixedAmountsDescriptions as array:', bundles.length, 'bundles found');
    }
    // 4. Try localFixedAmountsDescriptions as object
    else if (operatorDetails.localFixedAmountsDescriptions && typeof operatorDetails.localFixedAmountsDescriptions === 'object') {
      bundles = operatorDetails.localFixedAmountsDescriptions;
      bundlesSource = 'localFixedAmountsDescriptions-object';
      console.log('Using localFixedAmountsDescriptions as object:', Object.keys(bundles).length, 'entries found');
    }
    // 5. Try fixedAmounts as last resort (only amounts, no descriptions)
    else if (operatorDetails.fixedAmounts && Array.isArray(operatorDetails.fixedAmounts)) {
      bundles = operatorDetails.fixedAmounts;
      bundlesSource = 'fixedAmounts';
      console.log('Using fixedAmounts field:', bundles.length, 'amounts found');
    }
    // 5. Try any other array fields that might contain bundles
    else {
      // Look for any array fields that might contain bundle data
      const possibleBundleFields = Object.keys(operatorDetails).filter(key => 
        Array.isArray(operatorDetails[key]) && operatorDetails[key].length > 0
      );
      
      for (const field of possibleBundleFields) {
        if (field.toLowerCase().includes('bundle') || field.toLowerCase().includes('amount') || field.toLowerCase().includes('plan')) {
          bundles = operatorDetails[field];
          bundlesSource = field;
          console.log(`Using field ${field}:`, bundles.length, 'items found');
          break;
        }
      }
    }
    
    if (!bundles || (Array.isArray(bundles) && bundles.length === 0)) {
      console.log('No bundles data found in operator response. Available fields:', Object.keys(operatorDetails));
      return NextResponse.json([]);
    }

    let formattedBundles: { id: string; name: string; price: string; description: string; dataAmount: string; validity: string }[] = [];

    // Handle array format
    if (Array.isArray(bundles)) {
      formattedBundles = bundles.map((bundle: any, index: number) => ({
        id: bundle.bundleId?.toString() || bundle.id?.toString() || `${operatorDetails.operatorId}-${bundle.amount || bundle.price || index}`,
        name: bundle.name || bundle.title || bundle.description || `${bundle.dataAmount || bundle.data || 'Data Plan'} ${bundle.validity || bundle.validityPeriod || ''}`.trim(),
        price: (bundle.amount || bundle.price || bundle.localAmount || bundle.suggestedRetailPrice)?.toString() || '0',
        description: bundle.description || bundle.name || bundle.title || `Data bundle for ${operatorDetails.name || 'operator'}`,
        dataAmount: bundle.dataAmount || bundle.data || extractDataAmount(bundle.description || bundle.name || '') || 'N/A',
        validity: bundle.validity || bundle.validityPeriod || extractValidity(bundle.description || bundle.name || '') || '30 Days'
      }));
    }
    // Handle object format
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

    console.log(`Formatted bundles from ${bundlesSource}:`, formattedBundles.length, 'bundles');
    
    // Debug first few bundles before filtering
    console.log('Sample bundles before filtering:', formattedBundles.slice(0, 3));
    
    // Filter out any bundles with invalid data
    const validBundles = formattedBundles.filter((bundle, index) => {
      const isValid = bundle.price && bundle.price !== '0' && bundle.name && bundle.name.trim() !== '';
      if (!isValid && index < 3) {
        console.log(`Bundle ${index} filtered out:`, {
          price: bundle.price,
          name: bundle.name,
          description: bundle.description
        });
      }
      return isValid;
    });
    
    console.log('Valid bundles after filtering:', validBundles.length, 'bundles');
    if (validBundles.length > 0) {
      console.log('Sample valid bundles:', validBundles.slice(0, 3));
    }
    return NextResponse.json(validBundles);
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