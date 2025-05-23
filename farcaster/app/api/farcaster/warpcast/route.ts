import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for Warpcast API requests to bypass CORS issues
 */
export async function POST(request: NextRequest) {
  try {
    // Get the endpoint from the search params
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'wallet/resource';
    
    // Get the request body
    const body = await request.json();
    
    // Get authorization from headers
    const authorization = request.headers.get('Authorization');
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }
    
    // Forward the request to Warpcast
    const response = await fetch(`https://client.warpcast.com/v2/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
      },
      body: JSON.stringify(body),
    });
    
    // Get the response data
    const data = await response.json();
    
    // If the response was not successful, return an error
    if (!response.ok) {
      console.error('Warpcast API error:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    // Return the successful response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying to Warpcast:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Warpcast API' },
      { status: 500 }
    );
  }
}

// Also handle GET requests if needed
export async function GET(request: NextRequest) {
  try {
    // Get the endpoint from the search params
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || '';
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint parameter is required' },
        { status: 400 }
      );
    }
    
    // Get authorization from headers
    const authorization = request.headers.get('Authorization');
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }
    
    // Forward the request to Warpcast
    const response = await fetch(`https://client.warpcast.com/v2/${endpoint}`, {
      headers: {
        'Authorization': authorization,
      },
    });
    
    // Get the response data
    const data = await response.json();
    
    // If the response was not successful, return an error
    if (!response.ok) {
      console.error('Warpcast API error:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
    // Return the successful response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying to Warpcast:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Warpcast API' },
      { status: 500 }
    );
  }
}
