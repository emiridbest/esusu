import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Prevent caching if needed, though caching might be good. default is usually fine but force-dynamic avoids static gen issues.

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const API_BASE = process.env.NEXT_PUBLIC_CELOSCAN_API_BASE || 'https://explorer.celo.org/mainnet/api';
    const apiKey = process.env.NEXT_PUBLIC_CELOSCAN_API_KEY;

    // Construct URL
    // If api key is present and not in params, add it.
    const query = new URLSearchParams(searchParams);
    if (apiKey && !query.has('apikey')) {
        query.append('apikey', apiKey);
    }

    const url = `${API_BASE}?${query.toString()}`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            return NextResponse.json({ error: `Upstream error: ${res.status}`, status: "0", message: "Error" }, { status: res.status });
        }
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Internal Server Error', status: "0", message: "Proxy Error" }, { status: 500 });
    }
}
