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
  const searchParams = request.nextUrl.searchParams;
  const phoneNumber = searchParams.get('phoneNumber');
  const provider = searchParams.get('provider');
  const country = searchParams.get('country');

  if (!phoneNumber || !provider || !country) {
    return NextResponse.json({ error: 'Phone number, provider ID, and country code are required' }, { status: 400 });
  }

  try {
    const providerId = parseInt(provider);

    // Clean the phone number
    const cleanedPhoneNumber = phoneNumber.replace(/[^\d+]/g, '');

    // Detect the operator for this phone number
    const detectionResult = await detectOperator(cleanedPhoneNumber, country);

    if (!detectionResult || !detectionResult.operatorId) {
      return NextResponse.json({
        verified: false,
        message: 'Could not detect a network operator for this phone number'
      });
    }

    // Check if the detected operator matches the selected provider
    const detected = detectionResult.operatorId;

    if (detected === providerId) {
      return NextResponse.json({
        verified: true,
        operatorName: detectionResult.name,
        message: `Phone number verified with ${detectionResult.name}`
      });
    } else {
      return NextResponse.json({
        verified: false,
        operatorName: detectionResult.name,
        message: `This phone number belongs to ${detectionResult.name}, not the selected provider`,
        suggestedProvider: {
          id: detected.toString(),
          name: detectionResult.name
        }
      });
    }
  } catch (error: any) {
    console.error('Error verifying phone number:', error);

    // Handle the case where the number might not be valid
    if (error.message && error.message.includes('Invalid phone number')) {
      return NextResponse.json({
        verified: false,
        message: 'Invalid phone number format'
      });
    }

    return NextResponse.json(
      {
        verified: false,
        message: 'Failed to verify phone number',
        details: error.message
      },
      { status: 500 }
    );
  }
}
