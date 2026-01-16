import { NextRequest, NextResponse } from 'next/server';
import { getDingProducts, formatDingProductsToPlans } from '@/lib/dingConnect';

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

// Interface for operator details
interface OperatorDetails {
  operatorId: number;
  data?: boolean;
  localFixedAmountsDescriptions?: any[] | any;
  dataBundles?: any[];
  fixedAmountsDescriptions?: any;
  [key: string]: any;
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

// Removed getDataBundles function - we'll use operator details directly

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get('provider');
  const country = searchParams.get('country');
  if (!provider || !country) {
    return NextResponse.json({ error: 'Provider ID and country code are required' }, { status: 400 });
  }

  try {
    // Check if this is a DingConnect provider
    const isDingProvider = provider.startsWith('ding_');

    if (isDingProvider) {
      // DingConnect flow - fetch products for this country and filter by provider
      const providerCode = provider.replace('ding_', '');
      console.log(`[DingConnect] Fetching products for ${country}, looking for provider: ${providerCode}`);

      const dingProducts = await getDingProducts(country.toUpperCase());

      // Debug: Log all unique provider codes from products
      const uniqueProviderCodes = [...new Set(dingProducts.map(p => p.ProviderCode))];
      console.log(`[DingConnect] Found ${dingProducts.length} total products. Unique ProviderCodes:`, uniqueProviderCodes);

      // Filter products by provider code (case-insensitive)
      const providerProducts = dingProducts.filter(
        p => p.ProviderCode.toLowerCase() === providerCode.toLowerCase()
      );

      console.log(`[DingConnect] Matched ${providerProducts.length} products for "${providerCode}"`);

      // Format to standard bundle format
      const formattedBundles = formatDingProductsToPlans(providerProducts);

      console.log(`[DingConnect] Returning ${formattedBundles.length} data plans for ${providerCode}`);
      return NextResponse.json(formattedBundles);
    }

    // Reloadly flow
    const operatorId = parseInt(provider);
    const operatorDetails = await getOperator(operatorId) as OperatorDetails;

    if (!operatorDetails) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
    }

    // Check if this operator supports data bundles
    if (!operatorDetails.data) {
      return NextResponse.json([]);
    }

    // Get the bundles for this operator - prioritize fixedAmountsDescriptions, then localFixedAmountsDescriptions
    // Use local currency prices (like working version)
    let bundles: any = operatorDetails.localFixedAmountsDescriptions;

    // If no bundles found, try dataBundles field
    if (!bundles) {
      bundles = operatorDetails.dataBundles;
    }

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