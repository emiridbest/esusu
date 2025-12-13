import { NextRequest } from 'next/server';
import axios from 'axios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country');
    
    if (!country) {
      return Response.json(
        { error: 'Missing country parameter' },
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
    
    // Fetch airtime operators
    const operatorsResponse = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/operators/countries/${country}?includeData=false&status=ACTIVE`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': reloadlyConfig.acceptHeader
        }
      }
    );
    
    // Filter operators that support airtime topup
    const airtimeOperators = operatorsResponse.data.content.filter((operator: any) => 
      operator.supportsTopup === true
    );
    
    return Response.json(airtimeOperators);
    
  } catch (error: any) {
    console.error('Error fetching airtime operators:', error);
    
    return Response.json(
      { error: error?.response?.data?.message || error?.message || 'Failed to fetch airtime operators' },
      { status: error.response?.status || 500 }
    );
  }
}
