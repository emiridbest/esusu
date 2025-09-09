import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/../backend/lib/database/connection';
import { ThriftGroupMetadata } from '@/../backend/lib/database/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/thrift/metadata
// Body: { contractAddress: string; groupId: number; name: string; description?: string; createdBy?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contractAddress, groupId, name, description, createdBy } = body || {};

    if (!contractAddress || typeof groupId !== 'number' || !name) {
      return NextResponse.json({ error: 'Missing required fields: contractAddress, groupId, name' }, { status: 400 });
    }

    await dbConnect();

    const doc = await ThriftGroupMetadata.findOneAndUpdate(
      { contractAddress: contractAddress.toLowerCase(), groupId },
      { $set: { name, description, createdBy } },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json({ item: doc });
  } catch (error: any) {
    console.error('Error saving thrift metadata:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save thrift metadata' }, { status: 500 });
  }
}

// GET /api/thrift/metadata?contract=0x...&ids=1,2,3
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contract = searchParams.get('contract');
    const idsParam = searchParams.get('ids');

    if (!contract) {
      return NextResponse.json({ error: 'Missing contract query param' }, { status: 400 });
    }

    await dbConnect();

    const query: any = { contractAddress: contract.toLowerCase() };
    if (idsParam) {
      const ids = idsParam.split(',').map((v) => Number(v)).filter((n) => Number.isFinite(n));
      if (ids.length > 0) {
        query.groupId = { $in: ids };
      }
    }

    const docs = await ThriftGroupMetadata.find(query).lean();
    return NextResponse.json({ items: docs });
  } catch (error: any) {
    console.error('Error fetching thrift metadata:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch thrift metadata' }, { status: 500 });
  }
}
