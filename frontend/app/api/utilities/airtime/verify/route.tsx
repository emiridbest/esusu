import { NextRequest, NextResponse } from 'next/server';
import { detectOperator } from '@/services/utility/api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const phoneNumber = searchParams.get('phoneNumber');
  const provider = searchParams.get('provider');
  const country = searchParams.get('country');
  
  if (!phoneNumber || !provider || !country) {
    return NextResponse.json({ error: 'Phone number, provider ID, and country code are required' }, { status: 400 });
  }

  try {
    const providerId = parseInt(provider);
    
    // Clean the phone number
    const cleanedPhoneNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // Detect the operator for this phone number
    const detectionResult = await detectOperator(cleanedPhoneNumber, country);
    
    if (!detectionResult || !detectionResult.operatorId) {
      return NextResponse.json({
        verified: false,
        message: 'Could not detect a network operator for this phone number'
      });
    }
    
    // Check if the detected operator matches the selected provider
    const detected = detectionResult.operatorId;
    
    if (detected === providerId) {
      return NextResponse.json({
        verified: true,
        operatorName: detectionResult.name,
        message: `Phone number verified with ${detectionResult.name}`
      });
    } else {
      return NextResponse.json({
        verified: false,
        operatorName: detectionResult.name,
        message: `This phone number belongs to ${detectionResult.name}, not the selected provider`,
        suggestedProvider: {
          id: detected.toString(),
          name: detectionResult.name
        }
      });
    }
  } catch (error: any) {
    console.error('Error verifying phone number:', error);
    
    // Handle the case where the number might not be valid
    if (error.message && error.message.includes('Invalid phone number')) {
      return NextResponse.json({
        verified: false,
        message: 'Invalid phone number format'
      });
    }
    
    return NextResponse.json(
      { 
        verified: false,
        message: 'Failed to verify phone number',
        details: error.message
      },
      { status: 500 }
    );
  }
}
