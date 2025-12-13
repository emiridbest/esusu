/**
 * Frame Utilities Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { FIDMappingService } from '@/lib/frame/fidMapping';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const context = {
      fid: body.untrustedData?.fid || body.fid,
      walletAddress: body.untrustedData?.address,
      inputText: body.untrustedData?.inputText,
      buttonIndex: body.untrustedData?.buttonIndex,
    };

    if (!context.fid) {
      return NextResponse.json({ error: 'FID required' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esusu-farcaster.vercel.app';
    
    return NextResponse.json({
      version: 'vNext',
      image: `${baseUrl}/api/og/utilities`,
      buttons: [
        { label: '📱 Buy Airtime', action: 'post', target: `${baseUrl}/api/frame/utilities/airtime` },
        { label: '📶 Buy Data', action: 'post', target: `${baseUrl}/api/frame/utilities/data` },
        { label: '⚡ Pay Bills', action: 'post', target: `${baseUrl}/api/frame/utilities/bills` },
        { label: '🏠 Home', action: 'post', target: `${baseUrl}/api/frame` },
      ],
    });
  } catch (error) {
    console.error('Error in frame utilities:', error);
    return NextResponse.json({ error: 'Failed to load utilities' }, { status: 500 });
  }
}
