import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@esusu/backend/lib/database/connection';
import { Transaction, User, UBIClaim } from '@esusu/backend/lib/database/schemas';

/**
 * Calculate the Wednesday-to-Wednesday period boundaries.
 * Week offset 0 = current period, -1 = previous, etc.
 */
function getWeekBoundaries(weekOffset: number = 0): { start: Date; end: Date } {
  const now = new Date();
  // Find the most recent Wednesday at 00:00 UTC
  const day = now.getUTCDay(); // 0=Sun, 3=Wed
  const daysSinceWed = (day + 4) % 7; // days since last Wednesday
  const lastWed = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceWed,
    0, 0, 0, 0
  ));

  // If today IS Wednesday and before midnight, lastWed is today
  // Apply offset: each offset shifts by 7 days
  const start = new Date(lastWed.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  return { start, end };
}

// GET /api/leaderboard?week=0&wallet=0x...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekOffset = parseInt(searchParams.get('week') || '0', 10);
    const currentWallet = searchParams.get('wallet')?.toLowerCase() || '';

    // Limit how far back users can query (max 52 weeks)
    const safeOffset = Math.max(Math.min(weekOffset, 0), -52);
    const { start, end } = getWeekBoundaries(safeOffset);

    await dbConnect();

    // 1) Aggregate transaction counts per user (by ObjectId)
    const txCounts = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
          status: { $in: ['confirmed', 'completed'] },
        },
      },
      {
        $group: {
          _id: '$user',
          txCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: '$userDoc' },
      {
        $project: {
          _id: 0,
          walletAddress: { $toLower: '$userDoc.walletAddress' },
          txCount: 1,
        },
      },
    ]);

    // 2) Aggregate UBI claim counts per wallet
    const ubiCounts = await UBIClaim.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: { $toLower: '$walletAddress' },
          ubiCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          walletAddress: '$_id',
          ubiCount: 1,
        },
      },
    ]);

    // 3) Merge both counts by wallet address
    const walletMap = new Map<string, number>();
    for (const entry of txCounts) {
      walletMap.set(entry.walletAddress, (walletMap.get(entry.walletAddress) || 0) + entry.txCount);
    }
    for (const entry of ubiCounts) {
      walletMap.set(entry.walletAddress, (walletMap.get(entry.walletAddress) || 0) + entry.ubiCount);
    }

    // 4) Sort and take top 20
    const sorted = Array.from(walletMap.entries())
      .sort((a, b) => b[1] - a[1]);

    const leaderboard = sorted.slice(0, 20).map(([walletAddress, txCount], idx) => ({
      rank: idx + 1,
      walletAddress,
      txCount,
    }));

    // Check if the connected wallet is already in the top 20
    let currentUserEntry = null;
    if (currentWallet) {
      const isInTop20 = leaderboard.some(
        (e) => e.walletAddress === currentWallet
      );

      if (!isInTop20) {
        const userTotal = walletMap.get(currentWallet);
        if (userTotal && userTotal > 0) {
          // Count how many wallets have a higher total
          const rank = sorted.findIndex(([w]) => w === currentWallet) + 1;
          currentUserEntry = {
            rank,
            walletAddress: currentWallet,
            txCount: userTotal,
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      leaderboard,
      currentUser: currentUserEntry,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        weekOffset: safeOffset,
      },
    });
  } catch (error: any) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
