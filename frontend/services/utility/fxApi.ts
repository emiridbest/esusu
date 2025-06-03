
// Reloadly API configuration
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL;
const FX_API_ENDPOINT = process.env.NEXT_PUBLIC_FX_API_URL;
const SANDBOX_FX_API = process.env.NEXT_PUBLIC_SANDBOX_FX_API_URL;

// Cache for token and rates to minimize API calls
const tokenCache = {
  token: '',
  expiresAt: 0
};

const rateCache = new Map<string, { rate: number, timestamp: number }>();
const RATE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get access token
 * @returns Access token
 */
async function getAccessToken(): Promise<string> {
  // Check if token is still valid
  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  try {
    const clientId = process.env.NEXT_CLIENT_ID;
    const clientSecret = process.env.NEXT_CLIENT_SECRET;
    const isSandbox =process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';

    if (!clientId || !clientSecret || !AUTH_URL) {
      throw new Error('API credentials or AUTH_URL not configured');
    }

    // Get audience URL from env or default to API URL
    const audience = process.env.RELOADLY_AUDIENCE_URL || 
      (isSandbox 
        ? (process.env.NEXT_PUBLIC_SANDBOX_API_URL)
        : (process.env.NEXT_PUBLIC_API_URL));

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
 * Get exchange rate from Reloadly FX API
 * @param base_currency Source currency code
 * @param targetCurrency Target currency code
 * @returns Exchange rate
 */
async function getExchangeRate(base_currency: string, targetCurrency: string): Promise<number> {
  // Same currency, rate is 1
  if (base_currency === targetCurrency) {
    return 1;
  }

  // Check cache first
  const cacheKey = `${base_currency}-${targetCurrency}`;
  const cachedRate = rateCache.get(cacheKey);
  if (cachedRate && (Date.now() - cachedRate.timestamp < RATE_CACHE_DURATION)) {
    return cachedRate.rate;
  }

  try {
    const token = await getAccessToken();
    const isSandbox = process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';
    const fxEndpoint = isSandbox ? SANDBOX_FX_API : FX_API_ENDPOINT;
    
    if (!fxEndpoint) {
      throw new Error('FX API endpoint not configured');
    }
    
    let operator;
    if(base_currency === "ng") {
      operator = 341
    } else if (base_currency === "gh") {
      operator = 643
    } else if (base_currency === "ke") {
      operator = 265
    } else if (base_currency === "ug") {
      operator = 1152
    } else {
      return 0;
    }
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/com.reloadly.topups-v1+json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({operatorId: operator, amount: 1})
    };
    
    fetch(fxEndpoint, options)
      .then(res => res.json())
      .then(json => console.log(json))
      .catch(err => console.error('error:' + err));

    const response = await fetch(fxEndpoint, options)

    if (!response.ok) {
      throw new Error(`Failed to get exchange rate: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      fxRate?: number;
      rate?: number;
      source?: { amount: string };
      target?: { amount: string };
    };

    // The API returns rate directly or might return in a different format
    let fxRate;
    if (data.fxRate) {
      fxRate = data.fxRate;
    } else if (data.rate) {
      fxRate = data.rate;
    } else if (data.source && data.target) {
      // Fallback if rate is not in expected format
      const fromAmount = parseFloat(data.source.amount);
      const toAmount = parseFloat(data.target.amount);
      fxRate = toAmount / fromAmount;
    } else {
      throw new Error('Could not determine exchange rate from API response');
    }
    
    // Cache the rate
    rateCache.set(cacheKey, {
      rate: fxRate,
      timestamp: Date.now()
    });

    return fxRate;
  } catch (error) {
    console.error('Error getting exchange rate from Reloadly:', error);
    throw new Error('Failed to get exchange rate from Reloadly');
  }
}

/**
 * Convert USD to local currency
 * @param amountUSD Amount in USD
 * @param targetCurrency Target local currency code
 * @returns Converted amount in local currency
 */
export async function convertFromUSD(
  amountUSD: number | string,
  targetCurrency: string
): Promise<number> {
  try {
    const numericAmount = typeof amountUSD === 'string' ? parseFloat(amountUSD) : amountUSD;
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid amount for currency conversion');
    }
    
    if (targetCurrency === 'USD') {
      return numericAmount;
    }

    // Get exchange rate from USD to local currency
    const rate = await getExchangeRate('USD', targetCurrency);
    
    // Calculate converted amount
    const convertedAmount = numericAmount * rate;
    
    return convertedAmount;
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw error;
  }
}

/**
 * Convert local currency to USD
 * @param amount Amount in local currency
 * @param base_currency Source local currency code
 * @returns Converted amount in USD
 */
export async function convertToUSD(
  amount: number | string,
  base_currency: string
): Promise<number> {
  try {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid amount for currency conversion');
    }
    
    if (base_currency === 'USD') {
      return numericAmount;
    }

    // Get exchange rate from local currency to USD
    const rate = await getExchangeRate(base_currency, 'USD');
    
    // Calculate converted amount
    const convertedAmount = numericAmount / rate;
    
    return convertedAmount;
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw error;
  }
}

/**
 * Convert between any two currencies via USD
 * @param amount Amount to convert
 * @param fromCurrency Source currency code
 * @param toCurrency Target currency code
 * @returns Converted amount
 */
export async function convertCurrency(
  amount: string | number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  try {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Invalid amount for currency conversion');
    }
    
    // Same currency, no conversion needed
    if (fromCurrency === toCurrency) {
      return numericAmount;
    }

    // If converting to or from USD, use direct conversion
    if (fromCurrency === 'USD') {
      return await convertFromUSD(numericAmount, toCurrency);
    }
    
    if (toCurrency === 'USD') {
      return await convertToUSD(numericAmount, fromCurrency);
    }
    
    // For cross-currency conversion, convert to USD first, then to target currency
    const amountInUSD = await convertToUSD(numericAmount, fromCurrency);
    const convertedAmount = await convertFromUSD(amountInUSD, toCurrency);
    
    return convertedAmount;
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw error;
  }
}