import { convert } from '@/app/api/exchange_rate/route';
// Format currency with the appropriate symbol
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  if (isNaN(amount)) return '0.00';
  
  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency === 'NGN' ? 'NGN' : 'USD',
    minimumFractionDigits: 2,
  });
  
  return formatter.format(amount);
}

// Fetch exchange rate from our API endpoint
async function fetchExchangeRate(currency: string): Promise<number> {
  try {
    const rate = await convert({ base_currency: currency }); 
    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return 0; 
  }
}

// Convert between currencies using the live exchange rate
export const convertNairaToUSD = async (
  amountNGN: number, 
): Promise<number> => {
  try {
    const rate = await fetchExchangeRate('NGN=X');
    const amountUSD = amountNGN/rate
    return amountUSD;
  } catch (error) {
    console.error('Error converting currency:', error);
    return 0;
  }
};

// Convert USD to Naira
export const convertUSDToNaira = async (
  amountUSD: number
): Promise<number> => {
  try {
    const rate = await fetchExchangeRate('NGN=X');
    const amountNGN = amountUSD * rate;
    return amountNGN;
  } catch (error) {
    console.error('Error converting currency:', error);
    // return nothing
    return 0;    
  }
};

// Display price in Naira with equivalent stablecoin amount
export async function displayDualPrice(
  amountNGN: number,
  stablecoin: string = 'cUSD',
  includeFee: boolean = false
): Promise<{ nairaDisplay: string, cryptoDisplay: string, cryptoAmount: number }> {
  // Convert NGN to USD equivalent
  const cryptoAmount = await convertNairaToUSD(amountNGN);
  
  return {
    nairaDisplay: formatCurrency(amountNGN, 'NGN'),
    cryptoDisplay: formatCurrency(cryptoAmount, stablecoin),
    cryptoAmount
  };
}

export function parseAmount(amount: string | number): number {
  if (typeof amount === 'string') {
    const cleanAmount = amount.replace(/[₦$,]/g, '').trim();
    return parseFloat(cleanAmount) || 0;
  }
  return amount || 0;
}

// Calculate total with gas fee for utility transactions
export async function calculateTransactionTotal(
  amountNGN: number,
  stablecoin: string = 'cUSD'
): Promise<{ 
  nairaAmount: number, 
  cryptoAmount: number, 
  gasFeeUSD: number, 
  totalWithFee: number,
  nairaDisplay: string,
  cryptoDisplay: string,
  totalDisplay: string
}> {
  // Standard gas fee in USD
  const gasFeeUSD = 0.01;
  
  // Convert the base amount
  const baseAmount = await convertNairaToUSD(amountNGN);
  
  // Calculate total including gas fee
  const totalWithFee = baseAmount + gasFeeUSD;
  
  return {
    nairaAmount: amountNGN,
    cryptoAmount: baseAmount,
    gasFeeUSD,
    totalWithFee,
    nairaDisplay: formatCurrency(amountNGN, 'NGN'),
    cryptoDisplay: formatCurrency(baseAmount, stablecoin),
    totalDisplay: formatCurrency(totalWithFee, stablecoin)
  };
}