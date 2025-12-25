// Helper: fetch with retry and exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 2000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Failed to fetch after retries');
}
import { NextRequest, NextResponse } from 'next/server';

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
const RATE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Whitelist of valid fiat currency codes (ISO 4217) - excludes crypto
const FIAT_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'NGN', 'GHS', 'KES', 'UGX', 'ZAR', 'INR', 'PHP',
  'MXN', 'BRL', 'ARS', 'COP', 'PEN', 'CLP', 'JMD', 'HTG', 'DOP', 'TTD',
  'BBD', 'XCD', 'BSD', 'KYD', 'AWG', 'ANG', 'SRD', 'GYD', 'BZD', 'PAB',
  'CRC', 'NIO', 'HNL', 'GTQ', 'SVC', 'CUP', 'CUC', 'XOF', 'XAF', 'MAD',
  'EGP', 'TND', 'DZD', 'LYD', 'SDG', 'ETB', 'TZS', 'RWF', 'BIF', 'MWK',
  'ZMW', 'BWP', 'NAD', 'LSL', 'SZL', 'MZN', 'AOA', 'CDF', 'CAD', 'AUD',
  'NZD', 'JPY', 'CNY', 'KRW', 'SGD', 'HKD', 'TWD', 'THB', 'MYR', 'IDR',
  'VND', 'PKR', 'BDT', 'LKR', 'NPR', 'MMK', 'KHR', 'LAK', 'AFN', 'IRR',
  'IQD', 'JOD', 'KWD', 'LBP', 'OMR', 'QAR', 'SAR', 'SYP', 'YER', 'AED',
  'ILS', 'TRY', 'RUB', 'UAH', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK',
  'RSD', 'MKD', 'ALL', 'BAM', 'GEL', 'AMD', 'AZN', 'KZT', 'UZS', 'KGS',
  'TJS', 'TMT', 'MNT', 'CHF', 'SEK', 'NOK', 'DKK', 'ISK'
]);

// Resolve a representative operatorId for a given local currency.
// Note: FX rates are operator-specific in Reloadly; choose a stable, widely-used operator per country.
// Returns null for unsupported currencies (will fall back to fxratesapi)
function resolveOperatorIdForCurrency(currencyCode: string): number | null {
  const code = (currencyCode || '').toUpperCase();
  switch (code) {
    case 'NGN':
    case 'NG':
      return 341; // MTN Nigeria
    case 'GHS':
    case 'GH':
      return 643; // MTN Ghana
    case 'KES':
    case 'KE':
      return 265; // Safaricom Kenya
    case 'UGX':
    case 'UG':
      return 1152; // MTN Uganda
    default:
      return null; // Will use fxratesapi fallback
  }
}

/**
 * Fallback FX rate provider using fxratesapi.com
 * Used when Reloadly operator is not available for a currency
 */
async function getFxRatesApiRate(targetCurrency: string): Promise<number> {
  const cacheKey = `fxrates-USD-${targetCurrency}`;
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < RATE_CACHE_DURATION) {
    return cached.rate;
  }

  // Validate it's a fiat currency
  if (!FIAT_CURRENCIES.has(targetCurrency.toUpperCase())) {
    throw new Error(`Unsupported or crypto currency: ${targetCurrency}`);
  }

  try {
    const response = await fetch(`https://api.fxratesapi.com/latest?base=USD&currencies=${targetCurrency}`);
    if (!response.ok) {
      throw new Error(`FxRatesAPI request failed: ${response.status}`);
    }

    const data = await response.json();
    const rate = data.rates?.[targetCurrency.toUpperCase()];

    if (!rate || typeof rate !== 'number') {
      throw new Error(`No rate found for ${targetCurrency}`);
    }

    // Cache the rate
    rateCache.set(cacheKey, { rate, timestamp: Date.now() });
    console.log(`💱 FxRatesAPI rate for USD -> ${targetCurrency}: ${rate}`);

    return rate;
  } catch (error) {
    console.error('FxRatesAPI error:', error);
    throw new Error(`Failed to get exchange rate for ${targetCurrency}`);
  }
}

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
    const isSandbox = process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';

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
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
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
 * Get exchange rate from Reloadly FX API or fxratesapi fallback
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

  // Determine which currency to use for operator resolution.
  // If converting from USD -> local, base_currency will be 'USD', so use targetCurrency instead.
  const currencyForOperator = (base_currency || '').toUpperCase() === 'USD'
    ? targetCurrency
    : base_currency;
  const operator = resolveOperatorIdForCurrency(currencyForOperator);

  // If no Reloadly operator available, use fxratesapi fallback
  if (operator === null) {
    console.log(`No Reloadly operator for ${currencyForOperator}, using fxratesapi fallback`);
    const fallbackRate = await getFxRatesApiRate(targetCurrency);
    rateCache.set(cacheKey, { rate: fallbackRate, timestamp: Date.now() });
    return fallbackRate;
  }

  // Use Reloadly FX API for supported currencies
  try {
    const token = await getAccessToken();
    const isSandbox = process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';
    const fxEndpoint = isSandbox ? SANDBOX_FX_API : FX_API_ENDPOINT;

    if (!fxEndpoint) {
      throw new Error('FX API endpoint not configured');
    }

    // Normalize endpoint in case ENV is misconfigured (e.g., contains /{id}/fx-rate suffix)
    let normalizedFxEndpoint = fxEndpoint;
    if (/\/operators\/fx-rate\/\d+\/fx-rate$/.test(normalizedFxEndpoint)) {
      normalizedFxEndpoint = normalizedFxEndpoint.replace(/\/operators\/fx-rate\/\d+\/fx-rate$/, '/operators/fx-rate');
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/com.reloadly.topups-v1+json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ operatorId: operator, amount: 1 })
    };

    // Debug context for troubleshooting
    console.log('🔍 Calling Reloadly FX endpoint:', normalizedFxEndpoint);
    console.log('📤 Request body:', options.body);

    const response = await fetchWithRetry(normalizedFxEndpoint, options, 3, 2000);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📥 FX API response status:', response.status);
      console.error('❌ FX API error response:', errorText);
      throw new Error(`Reloadly FX API failed: ${response.status} ${response.statusText} - ${errorText}`);
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
    } else if (data.target && data.source) {
      // Calculate rate from target/source amounts
      const targetAmount = parseFloat(data.target.amount);
      const sourceAmount = parseFloat(data.source.amount);
      if (!isNaN(targetAmount) && !isNaN(sourceAmount) && sourceAmount !== 0) {
        fxRate = targetAmount / sourceAmount;
      }
    }

    if (!fxRate || typeof fxRate !== 'number' || isNaN(fxRate)) {
      console.error('❌ Could not extract valid exchange rate from response:', data);
      throw new Error('Could not determine exchange rate from Reloadly FX API response');
    }

    console.log('💱 Final exchange rate for', base_currency, '->', targetCurrency, ':', fxRate);

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
async function convertFromUSD(
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
async function convertToUSD(
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


export async function POST(request: NextRequest) {
  try {
    const { amount, base_currency } = await request.json();

    if (!amount || !base_currency) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    // Determine the correct conversion function based on currencies
    try {
      let convertedAmount: number;
      let rate: number;

      if (base_currency === 'USD') {
        // Convert from USD to local currency
        convertedAmount = await convertFromUSD(amount, base_currency);
        rate = convertedAmount / parseFloat(amount);
      } else {
        // Convert from local currency to USD
        convertedAmount = await convertToUSD(amount, base_currency);
        rate = convertedAmount / parseFloat(amount);
      }

      return NextResponse.json({
        fromAmount: parseFloat(amount),
        toAmount: convertedAmount.toFixed(2),
        rate: rate,
        fromCurrency: base_currency,
      });
    } catch (conversionError) {
      console.error('Currency conversion error:', conversionError);
      throw conversionError;
    }

  } catch (error: any) {
    console.error('Exchange rate API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process exchange rate request' },
      { status: 500 }
    );
  }
}