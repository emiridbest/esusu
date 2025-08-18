import { NextRequest, NextResponse } from 'next/server';
import { mapProviderToParent } from '@/services/utility/countryData';
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
 * Auto-detects operator for a phone number in a country
 * @param phone Phone number
 * @param countryCode ISO country code
 */
async function detectOperator(phone: string, countryCode: string) {
  try {
    return await apiRequest(`/operators/auto-detect/phone/${phone}/countries/${countryCode}`);
  } catch (error) {
    console.error(`Error detecting operator for ${phone} in ${countryCode}:`, error);
    throw error;
  }
}


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    const country = searchParams.get('country');
    const phoneNumber = searchParams.get('phoneNumber');
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    if (!provider) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    if (!country) {
      return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
    }

    // Clean the phone number - remove any spaces, dashes, or plus signs
    const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');
    // Detect the operator for the phone number
    const operatorData = await detectOperator(phoneNumber, country) as { operatorId: number, name: string };
    const currentProviderInfo = mapProviderToParent(provider, country);

    // Check if detected operator matches the provided operator
    if (operatorData && operatorData.operatorId && operatorData.operatorId.toString() === currentProviderInfo.parentId) {
      return NextResponse.json({
        verified: true,
        message: 'Phone number verified successfully',
        operatorName: operatorData.name
      });
    } else {
      return NextResponse.json({
        verified: false,
        message: 'Phone number does not match the selected provider',
        suggestedProvider: operatorData ? {
          id: operatorData.operatorId.toString(),
          name: operatorData.name
        } : null
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error verifying phone number:', error);

    // Handle specific error for invalid phone number format
    if (error.message && error.message.includes('Invalid phone number')) {
      return NextResponse.json({
        verified: false,
        message: 'Invalid phone number format'
      }, { status: 400 });
    }

    return NextResponse.json({
      verified: false,
      message: 'Failed to verify phone number',
      error: error.message
    }, { status: 500 });
  }
}