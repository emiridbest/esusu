import { NextRequest, NextResponse } from 'next/server';
import { convertToUSD, convertFromUSD } from '../../../services/utility/fxApi';

export async function POST(request: NextRequest) {
  try {
    const { amount, base_currency, quote_currency } = await request.json();
    
    if (!amount || !base_currency || !quote_currency) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    // Check if currencies are the same
    if (base_currency === quote_currency) {
      const numericAmount = parseFloat(amount);
      return NextResponse.json({
        fromAmount: numericAmount,
        toAmount: numericAmount.toString(),
        rate: 1,
        fromCurrency: base_currency,
        toCurrency: quote_currency
      });
    }
    
    // Determine the correct conversion function based on currencies
    try {
      let convertedAmount: number;
      let rate: number;
      
      if (base_currency === 'USD') {
        // Convert from USD to local currency
        convertedAmount = await convertFromUSD(amount, quote_currency);
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
        toCurrency: quote_currency
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