// Base URLs from environment variables
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL;
const SANDBOX_API_URL = process.env.NEXT_PUBLIC_SANDBOX_API_URL;
const PRODUCTION_API_URL = process.env.NEXT_PUBLIC_API_URL;

// Determine API URL based on environment
const isSandbox = process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';
const API_URL = isSandbox ? SANDBOX_API_URL : PRODUCTION_API_URL;

// Log API URL configuration on initialization for debugging
console.log('API Configuration:', {
    mode: isSandbox ? 'SANDBOX' : 'PRODUCTION',
    authUrl: AUTH_URL?.substring(0, 30) || '[NOT SET]',
    apiUrl: API_URL?.substring(0, 30) || '[NOT SET]'
});

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
 */async function getAccessToken(): Promise<string> {
   // Check if token is still valid
   if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
     return tokenCache.token;
   }
 
   try {
     const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
     const clientSecret = process.env.NEXT_PUBLIC_CLIENT_SECRET;
     const isSandbox =process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';
 
     if (!clientId || !clientSecret) {
       throw new Error('Reloadly API credentials not configured');
     }

  // Use regular API audience
  let audience = isSandbox 
    ? process.env.NEXT_PUBLIC_SANDBOX_API_URL
    : process.env.NEXT_PUBLIC_API_URL;
 
       const options = {
       method: 'POST',
       headers: {'Content-Type': 'application/json', 
         Accept: 'application/json'},
       body: JSON.stringify({
         client_id: clientId,
         client_secret: clientSecret,
         grant_type: 'client_credentials',
         audience: audience
       })
     };
 
     const response = await fetch(AUTH_URL, options);
 
     if (!response.ok) {
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
  const acceptHeader = process.env.NEXT_PUBLIC_ACCEPT_HEADER;

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
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}


/**
 * Fetches all countries supported by Reloadly
 */
export async function getCountries() {
  try {
    return await apiRequest('/countries');
  } catch (error) {
    console.error('Error fetching countries:', error);
    throw error;
  }
}

/**
 * Gets operators by country code
 * @param countryCode ISO country code
 */
export async function getOperatorsByCountry(countryCode: string) {
  try {
    // Create URL with query parameters
    const url = `/operators/countries/${countryCode}?includeBundles=true&includeData=true`;
    return await apiRequest(url);
  } catch (error) {
    console.error(`Error fetching operators for ${countryCode}:`, error);
    throw error;
  }
}



/**
 * Gets details of a specific operator
 * @param operatorId The ID of the operator
 */
export async function getOperator(operatorId: number) {
  try {
    return await apiRequest(`/operators/${operatorId}`);
  } catch (error) {
    console.error(`Error fetching operator ${operatorId}:`, error);
    throw error;
  }
}

/**
 * Auto-detects operator for a phone number in a country
 * @param phone Phone number
 * @param countryCode ISO country code
 */
export async function detectOperator(phone: string, countryCode: string) {
  try {
    return await apiRequest(`/operators/auto-detect/phone/${phone}/countries/${countryCode}`);
  } catch (error) {
    console.error(`Error detecting operator for ${phone} in ${countryCode}:`, error);
    throw error;
  }
}

/**
 * Makes a data bundle top-up
 * @param params Top-up parameters
 */
export async function makeTopup(params: {
  operatorId: number;
  amount: string;
  recipientPhone: {
    countryCode: string;
    number: string;
  };
  senderPhone?: {
    countryCode: string;
    number: string;
  };
  customIdentifier: string;
}) {
  try {
    // Perform input validation
    if (!params.operatorId || !params.amount || !params.recipientPhone || !params.customIdentifier) {
      throw new Error('Missing required fields for top-up');
    }

    return await apiRequest('/topups', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  } catch (error) {
    console.error('Error making top-up:', error);
    throw error;
  }
}

/**
 * Gets transaction status by ID
 * @param transactionId The transaction ID to check
 */
export async function getTransactionStatus(transactionId: number) {
  try {
    return await apiRequest(`/topups/${transactionId}/status`);
  } catch (error) {
    console.error(`Error fetching transaction status for ${transactionId}:`, error);
    throw error;
  }
}