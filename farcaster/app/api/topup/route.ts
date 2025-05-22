import { NextRequest, NextResponse } from 'next/server';
import { makeTopup } from '../../../services/utility/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operatorId, amount, recipientPhone, email } = body;
    console.log('Top-up request body:', body);
    
    // Validate required fields
    if (!operatorId || !amount || !recipientPhone || !recipientPhone.country || !recipientPhone.phoneNumber) {
      console.error('Missing required fields:', { operatorId, amount, recipientPhone });
      return NextResponse.json(
        { success: false, error: 'Missing required fields for top-up transaction' },
        { status: 400 }
      );
    }
  
    // Clean and format phone number (remove spaces, dashes, etc.)
    const cleanedPhoneNumber = recipientPhone.phoneNumber.replace(/[\s\-\+]/g, '');
    
    // Make the top-up request
    const result = await makeTopup({
      operatorId,
      amount,
      recipientPhone: {
        country: recipientPhone.country,
        phoneNumber: cleanedPhoneNumber
      },
      recipientEmail: email,
      useLocalAmount: true // Use local amount for better price accessibility
    });

    return NextResponse.json({
      success: true,
      transactionId: result.transactionId,
      status: result.status,
      message: 'Top-up successful'
    });
  } catch (error: any) {
    console.error('Error processing top-up:', error);
    
    // Handle different error types with detailed logging
    if (error.response?.data) {
      console.error('Reloadly API error:', error.response.data);
      return NextResponse.json(
        { 
          success: false,
          error: error.response.data.message || 'Failed to process topup', 
          details: error.response.data 
        },
        { status: error.response.status || 500 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to process topup'
      },
      { status: 500 }
    );
  }
}