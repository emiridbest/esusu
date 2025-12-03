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
      audience: process.env.NEXT_PUBLIC_UTILITIES_AUDIENCE_URL_PRODUCTION,
      acceptHeader: process.env.NEXT_PUBLIC_ACCEPT_HEADER_BILLER
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
    
    // Fetch cable TV providers
    const providersResponse = await axios.get(
      `${process.env.NEXT_PUBLIC_BILLER_API_URL}/biller/countries/${country}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': reloadlyConfig.acceptHeader
        }
      }
    );
    
    // Filter providers that support cable TV
    const cableProviders = providersResponse.data.content.filter((provider: any) => 
      provider.serviceType === 'CABLE_TV'
    );
    
    return Response.json(cableProviders);
    
  } catch (error: any) {
    console.error('Error fetching cable providers:', error);
    
    return Response.json(
      { error: error?.response?.data?.message || error?.message || 'Failed to fetch cable providers' },
      { status: error.response?.status || 500 }
    );
  }
}
