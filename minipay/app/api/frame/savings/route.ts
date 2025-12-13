/**
 * Frame Savings Route
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

    const walletAddress = await FIDMappingService.getWalletFromFID(context.fid);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esusu-farcaster.vercel.app';
    
    return NextResponse.json({
      version: 'vNext',
      image: `${baseUrl}/api/og/savings${walletAddress ? `?wallet=${walletAddress}` : ''}`,
      buttons: [
        { label: '💵 Deposit', action: 'post', target: `${baseUrl}/api/frame/savings/deposit` },
        { label: '💸 Withdraw', action: 'post', target: `${baseUrl}/api/frame/savings/withdraw` },
        { label: '📊 Balance', action: 'post', target: `${baseUrl}/api/frame/savings/balance` },
        { label: '🏠 Home', action: 'post', target: `${baseUrl}/api/frame` },
      ],
    });
  } catch (error) {
    console.error('Error in frame savings:', error);
    return NextResponse.json({ error: 'Failed to load savings' }, { status: 500 });
  }
}
