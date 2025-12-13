/**
 * Frame Groups Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { FIDMappingService } from '@/lib/frame/fidMapping';
import { GroupService } from '@esusu/backend/lib/services/groupService';

export const dynamic = 'force-dynamic';
const groupService = new GroupService();

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
    
    // Get user's groups count
    let groupCount = '0';
    if (walletAddress) {
      try {
        // @ts-ignore - Mongoose type compatibility
        const groups = await groupService.getUserGroups(walletAddress);
        groupCount = groups.length.toString();
      } catch (error) {
        console.error('Error getting user groups:', error);
      }
    }

    return NextResponse.json({
      version: 'vNext',
      image: `${baseUrl}/api/og/groups${walletAddress ? `?wallet=${walletAddress}&count=${groupCount}` : ''}`,
      buttons: [
        { label: '➕ Create Group', action: 'post', target: `${baseUrl}/api/frame/groups/create` },
        { label: '🔗 Join Group', action: 'post', target: `${baseUrl}/api/frame/groups/join` },
        { label: '👥 My Groups', action: 'post', target: `${baseUrl}/api/frame/groups/list` },
        { label: '🏠 Home', action: 'post', target: `${baseUrl}/api/frame` },
      ],
    });
  } catch (error) {
    console.error('Error in frame groups:', error);
    return NextResponse.json({ error: 'Failed to load groups' }, { status: 500 });
  }
}
