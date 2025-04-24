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

// Convert between currencies using the live exchange rate
export const convertNairaToUSD = async (
  amountNGN: number, 
  includeFee: boolean = false
): Promise<number> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/exchange-rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base_currency: 'NGN' })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const exchangeRateData = await response.json();
    const rate = includeFee ? exchangeRateData.padded_rate : exchangeRateData.rate;

    return amountNGN / rate;
  } catch (error) {
    console.error('Error converting currency:', error);
    const fallbackRate = includeFee ? 1550.01 : 1550.00;
    return amountNGN / fallbackRate;
  }
};

// Convert USD to Naira
export const convertUSDToNaira = async (
  amountUSD: number
): Promise<number> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/exchange-rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base_currency: 'NGN' })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const exchangeRateData = await response.json();
    return amountUSD * exchangeRateData.rate;
  } catch (error) {
    console.error('Error converting currency:', error);
    return amountUSD * 1550.00;
  }
};

// Display price in Naira with equivalent stablecoin amount
export async function displayDualPrice(
  amountNGN: number,
  stablecoin: string = 'cUSD',
  includeFee: boolean = false
): Promise<{ nairaDisplay: string, cryptoDisplay: string, cryptoAmount: number }> {
  // Convert NGN to USD equivalent
  const cryptoAmount = await convertNairaToUSD(amountNGN, includeFee);
  
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
  const baseAmount = await convertNairaToUSD(amountNGN, false);
  
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