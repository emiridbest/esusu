import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base_currency } = body;
    
    // Validate that base_currency is provided
    if (!base_currency) {
      return NextResponse.json({
        error: 'Missing required parameter',
        message: 'base_currency is required',
        status: 'error'
      }, { status: 400 });
    }
    
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
        
    try {
      const response = await fetch(`${apiUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base_currency })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Backend response:', data);
      return NextResponse.json(data);
      
    } catch (apiError: any) {
      console.error('Backend API error details:', {
        status: apiError.status,
        message: apiError.message
      });
      
      return NextResponse.json({
        error: 'Exchange rate service unavailable',
        status: 'error',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('Error in exchange_rate API route:', error);
    return NextResponse.json({
      rate: 1560.0,
      padded_rate: 1560.01,
      timestamp: new Date().toISOString(),
      with_fee: `Fallback rate with 0.01 USD gas fee padding`
    });
  }
}