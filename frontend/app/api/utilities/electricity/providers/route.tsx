import { NextRequest, NextResponse } from 'next/server';
import { electricityPaymentService } from '@esusu/backend/lib/services/electricityPaymentService';

interface ProviderDetails {
    id: string;
    name: string;
    serviceType: string;
    minLocalTransactionAmount: number;
    maxLocalTransactionAmount: number;
    localTransactionCurrencyCode: string;
}
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
/**
 * Makes an authenticated BILLER API request 
 * @param endpoint API endpoint
 * @param options Fetch options
 */
async function BillerApiRequest(endpoint: string, options: RequestInit = {}) {
    try {
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
            const errorText = await response.text().catch(() => 'Failed to read error response body');
            console.error(`Biller API request failed: ${response.status} ${response.statusText}, Body: ${errorText}`);
            throw new Error(`Biller API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            console.error('Network error when making biller API request. Check if API_URL is correct:', API_URL);
        }
        throw error;
    }
}
/**
 * Get all billers
 * @param countryCode ISO country code
 */
async function getBillerByCountry(countryCode: string) {
    try {
        const endpoint = `/billers?countryISOCode=${countryCode}`;


        if (!API_URL) {
            console.error('API_URL is not defined in environment variables');
            throw new Error('Biller API URL is not configured correctly');
        }

        return await BillerApiRequest(endpoint);
    } catch (error) {
        console.error(`Error fetching billers for ${countryCode}:`, error);
        throw error;
    }
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