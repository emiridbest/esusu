import fetch, { RequestInit } from 'node-fetch';

// Base URLs from environment variables
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL;
const SANDBOX_API_URL = process.env.NEXT_PUBLIC_SANDBOX_BILLER_API_URL;
const PRODUCTION_API_URL = process.env.NEXT_PUBLIC_BILLER_API_URL;

// Determine API URL based on environment
const API_URL = process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true'
    ? SANDBOX_API_URL
    : PRODUCTION_API_URL;


// Cache for token and rates to minimize API calls
const tokenCache = {
    token: '',
    expiresAt: 0
};

/**
 * Gets an OAuth 2.0 access token from 
 * Implements caching to avoid unnecessary token requests
 */async function getAccessToken(): Promise<string> {
    // Check if token is still valid
    if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
        return tokenCache.token;
    }

    try {
        const clientId = process.env.NEXT_PUBLIC_CLIENT_ID;
        const clientSecret = process.env.NEXT_PUBLIC_CLIENT_SECRET;
        const isSandbox = process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';

        if (!clientId || !clientSecret) {
            throw new Error(' API credentials not configured');
        }
        let audience = isSandbox
            ? SANDBOX_API_URL
            : PRODUCTION_API_URL;

        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials',
                audience: audience
            })
        };

        fetch(AUTH_URL, options)
            .then(res => res.json())
            .then(json => console.log(json))
            .catch(err => console.error('error:' + err));

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
        console.error('Error getting  access token:', error);
        throw new Error('Failed to authenticate with  API');
    }
}

/**
 * Creates authenticated request headers for  API
 */
async function getAuthHeaders() {
    const token = await getAccessToken();
    const acceptHeader = process.env.NEXT_PUBLIC_ACCEPT_HEADER_BILLER;

    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': acceptHeader
    };
}



/**
 * Makes an authenticated BILLER API request 
 * @param endpoint API endpoint
 * @param options Fetch options
 */
async function BillerApiRequest(endpoint: string, options: RequestInit = {}) {
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
 * Get all billers
 * @param countryCode ISO country code
 */
export async function getBillerByCountry(countryCode: string) {
    try {
        const url = `/billers?countryISOCode=${countryCode}`;

        const options = {
            method: 'GET',
            headers: await getAuthHeaders()
        };

        fetch(url, options)
            .then(res => res.json())
            .then(json => console.log(json))
            .catch(err => console.error('error:' + err));
        return await BillerApiRequest(url);
    } catch (error) {
        console.error(`Error fetching billers for ${countryCode}:`, error);
        throw error;
    }
}