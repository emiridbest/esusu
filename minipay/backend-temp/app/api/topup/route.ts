import { NextRequest } from 'next/server';
import axios from 'axios';
import { envConfig } from '@/lib/config/environment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate API key if present in environment
    const apiKey = process.env.PAYMENT_API_KEY;
    if (apiKey && req.headers.get('x-api-key') !== apiKey) {
      return Response.json(
        { error: 'Unauthorized: Invalid API key' },
        { status: 401 }
      );
    }
    
    // Extract data from request body
    const { 
      operatorId, 
      amount, 
      customId, 
      recipientPhone, 
      email, 
      type,
      transactionHash,
      expectedAmount,
      paymentToken
    } = body;
    
    // Validate required fields
    if (!operatorId || !amount || !recipientPhone) {
      return Response.json(
        { error: 'Missing required fields: operatorId, amount, recipientPhone' },
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
    
    // Make topup request to Reloadly
    const topupResponse = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/topups`,
      {
        operatorId,
        amount,
        customIdentifier: customId,
        recipientPhone,
        senderEmail: email,
        transactionHash,
        expectedAmount,
        paymentToken
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': reloadlyConfig.acceptHeader,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return Response.json({
      success: true,
      data: topupResponse.data
    });
    
  } catch (error: any) {
    console.error('Topup API error:', error);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      return Response.json(
        { error: 'Unauthorized: Invalid credentials or API key' },
        { status: 401 }
      );
    }
    
    return Response.json(
      { 
        error: error?.response?.data?.message || error?.message || 'Internal server error',
        success: false 
      },
      { status: error.response?.status || 500 }
    );
  }
}
