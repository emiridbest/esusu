import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@esusu/backend/lib/database/connection';
import { UserService } from '@esusu/backend/lib/services/userService';
import { UBIClaim } from '@esusu/backend/lib/database/schemas';

// POST /api/ubi-claim
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { walletAddress, txHash, amount, token, metadata } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Ensure user exists (create if not)
    await UserService.createOrUpdateUser(walletAddress);

    // Create claim record
    // @ts-ignore - Mongoose union type compatibility issue
    const claim = await UBIClaim.create({
      walletAddress: walletAddress.toLowerCase(),
      claimDate: new Date(),
      txHash,
      amount,
      token,
      metadata,
    });

    return NextResponse.json({ success: true, claim });
  } catch (error: any) {
    console.error('Error recording UBI claim:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/ubi-claim?wallet=0x...
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    // @ts-ignore - Mongoose union type compatibility issue
    const claims = await UBIClaim.find({ walletAddress: walletAddress.toLowerCase() }).sort({ claimDate: -1 });
    return NextResponse.json({ success: true, claims });
  } catch (error: any) {
    console.error('Error fetching UBI claims:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
