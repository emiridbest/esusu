import { NextRequest, NextResponse } from 'next/server';
import { makeTopup } from '../../../../services/utility/api';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { operatorId, amount, recipientPhone, senderPhone, customIdentifier } = body;
    
    // Validate required fields
    if (!operatorId || !amount || !recipientPhone || !recipientPhone.countryCode || !recipientPhone.number) {
      return NextResponse.json(
        { error: 'Missing required fields for top-up transaction' },
        { status: 400 }
      );
    }
    
    // Generate a default custom identifier if not provided
    const finalCustomIdentifier = customIdentifier || `farcaster-data-${Date.now()}`;
    
    // Make the top-up request
    const result = await makeTopup({
      operatorId,
      amount,
      recipientPhone,
      senderPhone,
      customIdentifier: finalCustomIdentifier
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error processing top-up:', error);
    
    // Handle different error types
    if (error.response?.data) {
      return NextResponse.json(
        { error: error.response.data.message || 'Failed to process topup', details: error.response.data },
        { status: error.response.status || 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to process topup' },
      { status: 500 }
    );
  }
}