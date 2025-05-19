import { NextRequest, NextResponse } from 'next/server';
import { detectOperator } from '../../../../../services/utility/api';

export async function GET(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, provider, country } = body;

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    
    if (!provider) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }
    
    if (!country) {
      return NextResponse.json({ error: 'Country code is required' }, { status: 400 });
    }

    // Clean the phone number - remove any spaces, dashes, or plus signs
    const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');
    
    // Detect the operator for the phone number
    const operatorData = await detectOperator(cleanPhone, country) as { operatorId: number, name: string };
    
    // Check if detected operator matches the provided operator
    if (operatorData && operatorData.operatorId && operatorData.operatorId.toString() === provider) {
      return NextResponse.json({ 
        verified: true, 
        message: 'Phone number verified successfully',
        operatorName: operatorData.name
      });
    } else {
      return NextResponse.json({ 
        verified: false, 
        message: 'Phone number does not match the selected provider',
        suggestedProvider: operatorData ? {
          id: operatorData.operatorId.toString(),
          name: operatorData.name
        } : null
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error verifying phone number:', error);
    
    // Handle specific error for invalid phone number format
    if (error.message && error.message.includes('Invalid phone number')) {
      return NextResponse.json({ 
        verified: false, 
        message: 'Invalid phone number format' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      verified: false, 
      message: 'Failed to verify phone number',
      error: error.message
    }, { status: 500 });
  }
}