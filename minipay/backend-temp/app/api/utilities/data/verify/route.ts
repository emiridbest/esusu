import { NextRequest } from 'next/server';
import axios from 'axios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneNumber = searchParams.get('phoneNumber');
    const providerId = searchParams.get('provider');
    const country = searchParams.get('country');
    
    if (!phoneNumber || !providerId || !country) {
      return Response.json(
        { error: 'Missing phoneNumber, provider, or country parameter' },
        { status: 400 }
      );
    }
    
    // Prepare request to Reloadly API
    const reloadlyConfig = {
      clientId: process.env.NEXT_CLIENT_ID,
      clientSecret: process.env.NEXT_CLIENT_SECRET,
      audience: process.env.NEXT_PUBLIC_AUDIENCE_URL,
      acceptHeader: process.env.NEXT_PUBLIC_ACCEPT_HEADER
    };
    
    // Get access token
    const authResponse = await axios.post(process.env.NEXT_PUBLIC_AUTH_URL!, {
      client_id: reloadlyConfig.clientId,
      client_secret: reloadlyConfig.clientSecret,
      grant_type: 'client_credentials',
      audience: reloadlyConfig.audience
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    const accessToken = authResponse.data.access_token;
    
    // Verify phone number with operator
    const verifyResponse = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/operators/auto-detect/phone-number`,
      {
        phoneNumber,
        country
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': reloadlyConfig.acceptHeader,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const detectedOperator = verifyResponse.data;
    
    // Check if the detected operator matches the provided operator
    const verified = detectedOperator.id.toString() === providerId.toString();
    
    if (verified) {
      return Response.json({
        verified: true,
        message: 'Phone number verified successfully',
        operatorName: detectedOperator.name
      });
    } else {
      // Try to find the correct operator
      const operatorsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/operators/countries/${country}?includeBundles=true&status=ACTIVE`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': reloadlyConfig.acceptHeader
          }
        }
      );
      
      const matchingOperator = operatorsResponse.data.content.find((op: any) => 
        op.id.toString() === detectedOperator.id.toString()
      );
      
      return Response.json({
        verified: false,
        message: `Phone number belongs to ${detectedOperator.operatorName} but you selected a different provider`,
        operatorName: detectedOperator.operatorName,
        suggestedProvider: matchingOperator ? {
          id: matchingOperator.id,
          name: matchingOperator.name
        } : undefined
      });
    }
    
  } catch (error: any) {
    console.error('Error verifying phone number:', error);
    
    // Handle specific error cases
    if (error.response?.status === 400) {
      return Response.json(
        { 
          verified: false,
          message: 'Invalid phone number format'
        },
        { status: 400 }
      );
    }
    
    return Response.json(
      { 
        verified: false,
        message: error?.response?.data?.message || error?.message || 'Failed to verify phone number'
      },
      { status: error.response?.status || 500 }
    );
  }
}
