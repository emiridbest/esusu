type ConversionResponse = {
  toAmount: string;
};

async function requestConversion(
  amount: number | string,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const numericAmount = typeof amount === 'string' ? Number(amount) : amount;

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid amount for currency conversion');
  }

  const response = await fetch('/api/exchange-rate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: numericAmount,
      from_currency: fromCurrency,
      to_currency: toCurrency
    })
  });

  if (!response.ok) {
    throw new Error('Currency conversion failed');
  }

  const data = await response.json() as ConversionResponse;
  const convertedAmount = Number(data.toAmount);

  if (!Number.isFinite(convertedAmount)) {
    throw new Error('Currency conversion returned an invalid amount');
  }

  return convertedAmount;
}

export async function convertFromUSD(amountUSD: number | string, targetCurrency: string): Promise<number> {
  return requestConversion(amountUSD, 'USD', targetCurrency);
}

export async function convertToUSD(amount: number | string, base_currency: string): Promise<number> {
  return requestConversion(amount, base_currency, 'USD');
}

export async function convertCurrency(
  amount: number | string,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const numericAmount = typeof amount === 'string' ? Number(amount) : amount;

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid amount for currency conversion');
  }

  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) {
    return numericAmount;
  }

  if (toCurrency.toUpperCase() === 'USD') {
    return requestConversion(numericAmount, fromCurrency, 'USD');
  }

  const amountInUsd = fromCurrency.toUpperCase() === 'USD'
    ? numericAmount
    : await requestConversion(numericAmount, fromCurrency, 'USD');

  return requestConversion(amountInUsd, 'USD', toCurrency);
}
