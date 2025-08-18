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
 * Makes a data bundle top-up
 * @param params Top-up parameters
 */

async function makeTopup(params: {
  operatorId: string;
  amount: string;
  customId: string;
  useLocalAmount?: boolean;
  recipientEmail?: string;
  recipientPhone: {
    country?: string;
    countryCode?: string;
    phoneNumber?: string;
    number?: string;
  };
}) {
  try {
    // Perform input validation
    if (!params.operatorId || !params.amount || !params.customId || !params.recipientPhone) {
      throw new Error('Missing required fields for top-up');
    }

    const requestBody = {
      operatorId: parseInt(params.operatorId),
      amount: params.useLocalAmount ? parseFloat(params.amount) : null,
      useLocalAmount: !!params.useLocalAmount,
      recipientEmail: params.recipientEmail || null,
      customIdentifier: params.customId,
      recipientPhone: {
        countryCode: params.recipientPhone.country || params.recipientPhone.countryCode || '',
        number: params.recipientPhone.phoneNumber || params.recipientPhone.number || ''
      },
      senderPhone: null
    };


    // Use the apiRequest function to make the call
    const response = await apiRequest('/topups', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });

    return response;
  } catch (error) {
    console.error('Error making top-up:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operatorId, amount, customId, recipientPhone, email } = body;

    // Validate required fields
    if (!operatorId || !amount || !customId || !recipientPhone || !recipientPhone.country || !recipientPhone.phoneNumber) {
      console.error('Missing required fields:', { operatorId, amount, customId, recipientPhone });
      return NextResponse.json(
        { success: false, error: 'Missing required fields for top-up transaction' },
        { status: 400 }
      );
    }

    // Clean and format phone number (remove spaces, dashes, etc.)
    const cleanedPhoneNumber = recipientPhone.phoneNumber.replace(/[\s\-\+]/g, '');

    // Make the top-up request
    const result = await makeTopup({
      operatorId,
      amount,
      customId: customId,
      recipientPhone: {
        country: recipientPhone.country,
        phoneNumber: cleanedPhoneNumber
      },
      recipientEmail: email,
      useLocalAmount: true // Use local amount for better price accessibility
    });

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      status: result.status,
      message: 'Top-up successful'
    });
  } catch (error: any) {
    console.error('Error processing top-up:', error);

    // Handle different error types with detailed logging
    if (error.response?.data) {
      console.error('Reloadly API error:', error.response.data);
      return NextResponse.json(
        {
          success: false,
          error: error.response.data.message || 'Failed to process topup',
          details: error.response.data
        },
        { status: error.response.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process topup'
      },
      { status: 500 }
    );
  }
}