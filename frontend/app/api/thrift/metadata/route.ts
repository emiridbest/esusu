import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/../backend/lib/database/connection';
import { ThriftGroupMetadata } from '@/../backend/lib/database/schemas';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildMessage(payload: { contractAddress: string; groupId: number; name: string; description?: string; coverImageUrl?: string; category?: string; tags?: string[]; timestamp: number }) {
  const { contractAddress, groupId, name, description = '', coverImageUrl = '', category = '', tags = [], timestamp } = payload;
  return [
    'Esusu: Thrift Metadata Update',
    `contractAddress=${contractAddress.toLowerCase()}`,
    `groupId=${groupId}`,
    `name=${name}`,
    `description=${description}`,
    `coverImageUrl=${coverImageUrl}`,
    `category=${category}`,
    `tags=${Array.isArray(tags) ? tags.join(',') : ''}`,
    `timestamp=${timestamp}`,
  ].join('\n');
}

function isTimestampFresh(ts: number, maxSkewMs = 5 * 60 * 1000) {
  const now = Date.now();
  return Math.abs(now - ts) <= maxSkewMs;
}

// POST /api/thrift/metadata
// Body: { contractAddress, groupId, name, description, signerAddress, signature, timestamp }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      contractAddress,
      groupId,
      name,
      description = '',
      coverImageUrl,
      category,
      tags,
      signerAddress,
      signature,
      timestamp,
    } = body || {};

    if (!contractAddress || typeof groupId !== 'number' || !name) {
      return NextResponse.json({ error: 'Missing required fields: contractAddress, groupId, name' }, { status: 400 });
    }

    // Session-first auth: use SIWE session if present
    let recovered = '';
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('esusu_session')?.value;
    const jwtSecret = process.env.NEXTAUTH_SECRET || process.env.SIWE_JWT_SECRET || 'dev_secret_change_me';
    if (sessionCookie) {
      try {
        const payload = jwt.verify(sessionCookie, jwtSecret) as any;
        if (payload?.address) {
          recovered = String(payload.address).toLowerCase();
        }
      } catch (_) {
        // invalid session cookie; continue to signature fallback
      }
    }

    // Fallback to signature verification
    if (!recovered) {
      if (!signerAddress || !signature || !timestamp) {
        return NextResponse.json({ error: 'Missing auth: provide SIWE session or signerAddress/signature/timestamp' }, { status: 401 });
      }
      if (!isTimestampFresh(Number(timestamp))) {
        return NextResponse.json({ error: 'Stale or invalid timestamp' }, { status: 400 });
      }
      const message = buildMessage({ contractAddress, groupId, name, description, coverImageUrl, category, tags: Array.isArray(tags) ? tags : [], timestamp: Number(timestamp) });
      try {
        recovered = ethers.verifyMessage(message, signature).toLowerCase();
      } catch (e) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      if (recovered !== String(signerAddress).toLowerCase()) {
        return NextResponse.json({ error: 'Signature address mismatch' }, { status: 401 });
      }
    }

    await dbConnect();

    const key = { contractAddress: contractAddress.toLowerCase(), groupId };
    // @ts-ignore - Mongoose union type compatibility issue
    const existing = await ThriftGroupMetadata.findOne(key);

    if (!existing) {
      // Create new metadata, set createdBy = recovered
      // @ts-ignore - Mongoose union type compatibility issue
      const created = await ThriftGroupMetadata.create({
        ...key,
        name,
        description,
        coverImageUrl,
        category,
        tags: Array.isArray(tags) ? tags : undefined,
        createdBy: recovered.toLowerCase(),
        updatedBy: recovered.toLowerCase(),
        updateLog: [{ by: recovered.toLowerCase(), at: new Date(), changes: { name, description, coverImageUrl, category, tags } }],
      });
      return NextResponse.json({ item: created.toObject() });
    }

    // Only the creator can update
    if ((existing.createdBy || '').toLowerCase() !== recovered.toLowerCase()) {
      return NextResponse.json({ error: 'Only the creator can update metadata' }, { status: 403 });
    }

    const changes: any = {};
    if (existing.name !== name) changes.name = name;
    if ((existing.description || '') !== description) changes.description = description;
    if ((existing.coverImageUrl || '') !== (coverImageUrl || '')) changes.coverImageUrl = coverImageUrl;
    if ((existing.category || '') !== (category || '')) changes.category = category;
    const incomingTags = Array.isArray(tags) ? tags : undefined;
    if (incomingTags && JSON.stringify(existing.tags || []) !== JSON.stringify(incomingTags)) changes.tags = incomingTags;

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ item: existing.toObject(), message: 'No changes' });
    }

    existing.name = changes.name ?? existing.name;
    existing.description = changes.description ?? existing.description;
    if ('coverImageUrl' in changes) existing.coverImageUrl = changes.coverImageUrl;
    if ('category' in changes) existing.category = changes.category;
    if ('tags' in changes) existing.tags = changes.tags;
    existing.updatedBy = recovered.toLowerCase();
    existing.updateLog = existing.updateLog || [];
    existing.updateLog.push({ by: recovered.toLowerCase(), at: new Date(), changes });
    // @ts-ignore - Mongoose union type compatibility issue
    await existing.save();

    return NextResponse.json({ item: existing.toObject() });
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

    // @ts-ignore - Mongoose union type compatibility issue
    const docs = await ThriftGroupMetadata.find(query).lean();
    return NextResponse.json({ items: docs });
  } catch (error: any) {
    console.error('Error fetching thrift metadata:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch thrift metadata' }, { status: 500 });
  }
}
