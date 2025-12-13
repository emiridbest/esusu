/**
 * Main Frame Handler Route
 * Processes all Farcaster frame interactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { FIDMappingService } from '@/lib/frame/fidMapping';
import { FrameTransactionProcessor } from '@/lib/frame/frameTransactionProcessor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Frame metadata for initial load
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'home';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esusu-farcaster.vercel.app';

  const frameMetadata = {
    version: 'vNext',
    image: `${baseUrl}/api/og/home`,
    buttons: [
      { label: '💰 Savings', action: 'post', target: `${baseUrl}/api/frame/savings` },
      { label: '👥 Groups', action: 'post', target: `${baseUrl}/api/frame/groups` },
      { label: '⚡ Utilities', action: 'post', target: `${baseUrl}/api/frame/utilities` },
      { label: '🎁 Freebies', action: 'post', target: `${baseUrl}/api/frame/freebies` },
    ],
  };

  return NextResponse.json(frameMetadata);
}

/**
 * Handle frame button actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract frame context from request
    const context = {
      fid: body.untrustedData?.fid || body.fid,
      walletAddress: body.untrustedData?.address || body.address,
      inputText: body.untrustedData?.inputText || body.inputText,
      buttonIndex: body.untrustedData?.buttonIndex || body.buttonIndex,
      state: body.untrustedData?.state || body.state,
    };

    // Validate FID
    if (!context.fid) {
      return NextResponse.json({
        error: 'Invalid request: FID required',
      }, { status: 400 });
    }

    // Link wallet if provided
    if (context.walletAddress) {
      await FIDMappingService.getOrCreateMapping(context.fid, context.walletAddress);
    }

    // Get wallet for this FID
    const walletAddress = await FIDMappingService.getWalletFromFID(context.fid);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esusu-farcaster.vercel.app';

    // Return home frame response
    return NextResponse.json({
      version: 'vNext',
      image: `${baseUrl}/api/og/home${walletAddress ? `?wallet=${walletAddress}` : ''}`,
      buttons: [
        { label: '💰 Savings', action: 'post', target: `${baseUrl}/api/frame/savings` },
        { label: '👥 Groups', action: 'post', target: `${baseUrl}/api/frame/groups` },
        { label: '⚡ Utilities', action: 'post', target: `${baseUrl}/api/frame/utilities` },
        { label: '🎁 Freebies', action: 'post', target: `${baseUrl}/api/frame/freebies` },
      ],
    });
  } catch (error) {
    console.error('Error processing frame action:', error);
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://esusu-farcaster.vercel.app';
    return NextResponse.json({
      version: 'vNext',
      image: `${baseUrl}/api/og/error?message=Something went wrong`,
      buttons: [
        { label: '🏠 Home', action: 'post', target: `${baseUrl}/api/frame` },
      ],
    }, { status: 500 });
  }
}
