
/**
 * Format currency with the appropriate symbol
 * @param amount - Amount to format
 * @param currency - Currency code (USD, NGN, GHS, etc.)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string): string {
  if (isNaN(amount)) return '0.00';
  
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    });
    
    return formatter.format(amount);
  } catch (error) {
    // Fallback for unsupported currency codes
    return currency === 'USD' ? `$${amount.toFixed(2)}` : `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Parse amount from string or number, removing currency symbols
 * @param amount - Amount as string or number
 * @returns Numeric amount
 */
export function parseAmount(amount: string | number): number {
  if (typeof amount === 'string') {
    // Remove currency symbols and commas
    const cleanAmount = amount.replace(/[₦$€£¥,]/g, '').trim();
    return parseFloat(cleanAmount) || 0;
  }
  return amount || 0;
}

/**
 * Legacy functions below - use UtilityContext's convertCurrency instead
 * These are kept for backward compatibility
 */

// Display price in local currency with equivalent stablecoin amount
export async function displayDualPrice(
  amount: number,
  fromCurrency: string = 'NGN',
  stablecoin: string = 'cUSD',
  includeFee: boolean = false
): Promise<{ nairaDisplay: string, cryptoDisplay: string, cryptoAmount: number }> {
  try {
    // Call the exchange rate API
    const response = await fetch('/api/exchange-rate/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount.toString(),
        base_currency: fromCurrency,
        quote_currency: 'USD',
      }),
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to convert currency');
    }
    
    const cryptoAmount = parseFloat(data.toAmount);
    
    return {
      nairaDisplay: formatCurrency(amount, fromCurrency),
      cryptoDisplay: formatCurrency(cryptoAmount, 'USD'),
      cryptoAmount
    };
  } catch (error) {
    console.error('Error in displayDualPrice:', error);
    return {
      nairaDisplay: formatCurrency(amount, fromCurrency),
      cryptoDisplay: formatCurrency(0, 'USD'),
      cryptoAmount: 0
    };
  }
}

// Calculate total with gas fee for utility transactions
export async function calculateTransactionTotal(
  amount: number,
  fromCurrency: string = 'NGN',
  stablecoin: string = 'cUSD'
): Promise<{ 
  nairaDisplay: string, 
  cryptoDisplay: string, 
  totalDisplay: string,
  gasFeeUSD: number,
  cryptoAmount: number 
}> {
  try {
    // Standard gas fee in USD
    const gasFeeUSD = 0.01;
    
    // Call the exchange rate API
    const response = await fetch('/api/exchange-rate/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount.toString(),
        base_currency: fromCurrency,
        quote_currency: 'USD',
      }),
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to convert currency');
    }
    
    const cryptoAmount = parseFloat(data.toAmount);
    const totalWithFee = cryptoAmount + gasFeeUSD;
    
    return {
      nairaDisplay: formatCurrency(amount, fromCurrency),
      cryptoDisplay: formatCurrency(cryptoAmount, 'USD'),
      totalDisplay: formatCurrency(totalWithFee, 'USD'),
      gasFeeUSD,
      cryptoAmount
    };
  } catch (error) {
    console.error('Error in calculateTransactionTotal:', error);
    return {
      nairaDisplay: formatCurrency(amount, fromCurrency),
      cryptoDisplay: formatCurrency(0, 'USD'),
      totalDisplay: formatCurrency(0.01, 'USD'),
      gasFeeUSD: 0.01,
      cryptoAmount: 0
    };
  }
}