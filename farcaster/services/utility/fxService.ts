/**
 * Reloadly FX API client for currency conversions
 * This service handles all interactions with the Reloadly foreign exchange API
 */

const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET;
const FX_API_BASE_URL = process.env.NEXT_PUBLIC_FX_API_URL;
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL;
// Types for API responses
type ReloadlyAuthResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type ReloadlyFXRateResponse = {
  rate: number;
  source: string;
  target: string;
  timestamp: number;
};

/**
 * Get an authentication token from Reloadly API
 * @returns Promise with the auth token
 */
async function getAuthToken(): Promise<string> {
  try {
    const response = await fetch(`${AUTH_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: API_KEY,
        client_secret: API_SECRET,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get auth token: ${response.statusText}`);
    }

    const data: ReloadlyAuthResponse = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Reloadly auth token:', error);
    throw new Error('Failed to authenticate with Reloadly API');
  }
}

/**
 * Get the exchange rate between two currencies using Reloadly FX API
 * @param sourceCurrency Source currency code (e.g., NGN, GHS)
 * @param targetCurrency Target currency code (e.g., USD, EUR)
 * @returns Promise with the exchange rate
 */
export async function getExchangeRate(
  sourceCurrency: string,
  targetCurrency: string
): Promise<number> {
  try {

    const token = await getAuthToken();
    const response = await fetch(
      `${FX_API_BASE_URL}/rates?source=${sourceCurrency}&target=${targetCurrency}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get exchange rate: ${response.statusText}`);
    }

    const data: ReloadlyFXRateResponse = await response.json();
    return data.rate;
  } catch (error) {
    console.error('Error getting exchange rate from Reloadly:', error);
    throw new Error('Failed to get exchange rate');
  }
}

/**
 * Convert an amount from one currency to another
 * @param amount Amount to convert
 * @param sourceCurrency Source currency code (e.g., NGN, GHS)
 * @param targetCurrency Target currency code (e.g., USD, EUR)
 * @returns Promise with the converted amount
 */
export async function convertCurrency(
  amount: number | string,
  sourceCurrency: string,
  targetCurrency: string
): Promise<number> {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    throw new Error('Invalid amount');
  }
  
  if (sourceCurrency === targetCurrency) {
    return numericAmount;
  }
  
  const rate = await getExchangeRate(sourceCurrency, targetCurrency);
  return numericAmount / rate;
}


export default {
  getExchangeRate,
  convertCurrency,
};