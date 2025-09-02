import { NextRequest } from 'next/server';
import axios from 'axios';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get('provider');
    const country = searchParams.get('country');
    
    if (!providerId || !country) {
      return Response.json(
        { error: 'Missing provider or country parameter' },
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
    
    // Fetch cable TV packages for the provider
    const packagesResponse = await axios.get(
      `${process.env.NEXT_PUBLIC_BILLER_API_URL}/biller/${providerId}/packages`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': reloadlyConfig.acceptHeader
        }
      }
    );
    
    return Response.json(packagesResponse.data.content);
    
  } catch (error: any) {
    console.error('Error fetching cable packages:', error);
    
    return Response.json(
      { error: error?.response?.data?.message || error?.message || 'Failed to fetch cable packages' },
      { status: error.response?.status || 500 }
    );
  }
}
