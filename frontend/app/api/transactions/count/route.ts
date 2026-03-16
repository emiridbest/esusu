import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@esusu/backend/lib/database/connection';
import { Transaction, User, UBIClaim } from '@esusu/backend/lib/database/schemas';

// GET /api/transactions/count?wallet=0x...  — count confirmed transactions for a wallet
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    await dbConnect();
    // @ts-ignore - Mongoose union type compatibility issue
    const user = await User.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        count: 0,
        eligible: false,
      });
    }

    const [txCount, ubiCount] = await Promise.all([
      Transaction.countDocuments({
        user: user._id,
        status: { $in: ['confirmed', 'completed'] },
      }),
      UBIClaim.countDocuments({
        walletAddress: walletAddress.toLowerCase(),
      }),
    ]);

    const count = txCount + ubiCount;

    return NextResponse.json({
      success: true,
      count,
      transactions: txCount,
      ubiClaims: ubiCount,
      eligible: count >= 3,
    });
  } catch (error: any) {
    console.error('Error counting transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
