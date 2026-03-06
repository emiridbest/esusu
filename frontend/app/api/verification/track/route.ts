import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@esusu/backend/lib/database/connection';
import { FaceVerificationLog } from '@esusu/backend/lib/database/faceVerificationLog';

export async function POST(req: NextRequest) {
  try {
    const { address, timestamp, success, status, error, extra } = await req.json();

    await dbConnect();

    const log = new FaceVerificationLog({
      address,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      success,
      status,
      error,
      extra,
    });

    await log.save();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
