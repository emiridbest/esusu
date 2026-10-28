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
    
    const isSandbox = process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';
    const authUrl = process.env.RELOADLY_AUTH_URL;
    const apiUrl = isSandbox
      ? process.env.NEXT_PUBLIC_SANDBOX_API_URL
      : process.env.NEXT_PUBLIC_API_URL;
    const audience = isSandbox
      ? process.env.RELOADLY_SANDBOX_AUDIENCE_URL || apiUrl
      : process.env.RELOADLY_AUDIENCE_URL || apiUrl;
    const clientId = process.env.RELOADLY_CLIENT_ID;
    const clientSecret = process.env.RELOADLY_CLIENT_SECRET;
    const acceptHeader = process.env.NEXT_PUBLIC_ACCEPT_HEADER;

    if (!authUrl || !apiUrl || !audience || !clientId || !clientSecret) {
      throw new Error('Reloadly server configuration is incomplete');
    }
    
    // Get access token
    const authResponse = await axios.post(authUrl, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      audience
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    const accessToken = authResponse.data.access_token;
    
    // Fetch mobile operators that support data bundles
    const operatorsResponse = await axios.get(
      `${apiUrl}/operators/countries/${encodeURIComponent(country)}?includeBundles=true&status=ACTIVE`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': acceptHeader
        }
      }
    );
    
    // Filter operators that support data bundles
    const dataOperators = operatorsResponse.data.content.filter((operator: any) => 
      operator.supportsData === true || operator.supportsBundles === true
    );
    
    return Response.json(dataOperators);
    
  } catch (error: any) {
    console.error('Error fetching mobile operators:', error);
    
    return Response.json(
      { error: error?.response?.data?.message || error?.message || 'Failed to fetch mobile operators' },
      { status: error.response?.status || 500 }
    );
  }
}
