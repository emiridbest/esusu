import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@esusu/backend/lib/database/connection';
import { Transaction } from '@esusu/backend/lib/database/schemas';

const ADMIN_WALLETS = [
  '0x4d4cc2e0c5cbc9737a0dec28d7c2510e2bef5a0',
  '0xb8c198e8f563096c9df0067e7e64a4da8c129d5a',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Auth check — caller must pass their wallet as ?admin= param
    const caller = (searchParams.get('admin') || '').toLowerCase();
    if (!ADMIN_WALLETS.includes(caller)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const subType = searchParams.get('subType') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || undefined;

    await dbConnect();

    const query: Record<string, any> = { type: 'utility_payment' };
    if (subType) query.subType = subType;
    if (status) query.status = status;
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { transactionHash: re },
        { 'utilityDetails.recipient': re },
        { 'utilityDetails.provider': re },
      ];
    }

    const [transactions, total] = await Promise.all([
      (Transaction as any).find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .populate('user', 'walletAddress profileData email')
        .lean(),
      Transaction.countDocuments(query),
    ]);

    return NextResponse.json({ success: true, transactions, total });
  } catch (error: any) {
    console.error('Admin utility-transactions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
