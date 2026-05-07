import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@esusu/backend/lib/database/connection';
import { Invite } from '@esusu/backend/lib/database/schemas';

// GET /api/invites?wallet=0x...       — get the stored inviter for a wallet
// GET /api/invites?inviter=0x...      — get all wallets referred by this inviter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const inviterAddress = searchParams.get('inviter');

    if (!walletAddress && !inviterAddress) {
      return NextResponse.json(
        { success: false, error: 'wallet or inviter query param is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Return all referrals made by this inviter
    if (inviterAddress) {
      // @ts-ignore - Mongoose union type compatibility issue
      const invites = await Invite.find({ inviterAddress: inviterAddress.toLowerCase() })
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({
        success: true,
        referrals: invites.map((inv: any) => ({
          walletAddress: inv.walletAddress,
          claimed: inv.claimed,
          createdAt: inv.createdAt,
        })),
      });
    }

    // Return the stored inviter for a given wallet
    // @ts-ignore - Mongoose union type compatibility issue
    const invite = await Invite.findOne({ walletAddress: walletAddress!.toLowerCase() });

    return NextResponse.json({
      success: true,
      invite: invite
        ? {
            inviterAddress: invite.inviterAddress,
            claimed: invite.claimed,
            createdAt: invite.createdAt,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error fetching invite:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/invites  — store an inviter for a wallet (first inviter wins)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, inviterAddress } = body;

    if (!walletAddress || !inviterAddress) {
      return NextResponse.json(
        { success: false, error: 'walletAddress and inviterAddress are required' },
        { status: 400 }
      );
    }

    // Prevent self-referral
    if (walletAddress.toLowerCase() === inviterAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Cannot invite yourself' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Only the first inviter is stored (unique index on walletAddress)
    // @ts-ignore - Mongoose union type compatibility issue
    const existing = await Invite.findOne({ walletAddress: walletAddress.toLowerCase() });

    if (existing) {
      return NextResponse.json({
        success: true,
        invite: {
          inviterAddress: existing.inviterAddress,
          claimed: existing.claimed,
          createdAt: existing.createdAt,
        },
        alreadyExists: true,
      });
    }

    // @ts-ignore - Mongoose union type compatibility issue
    const invite = await Invite.create({
      walletAddress: walletAddress.toLowerCase(),
      inviterAddress: inviterAddress.toLowerCase(),
      source: 'url' as const,
    });

    return NextResponse.json({
      success: true,
      invite: {
        inviterAddress: invite.inviterAddress,
        claimed: invite.claimed,
        createdAt: invite.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error storing invite:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
