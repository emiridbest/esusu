import { NextRequest, NextResponse } from 'next/server';

// In-memory store for demonstration. Replace with DB in production.
const verificationLogs: any[] = [];

export async function POST(req: NextRequest) {
  try {
    const { address, timestamp, success, error, extra } = await req.json();
    verificationLogs.push({ address, timestamp, success, error, extra });
    // TODO: Persist to database or analytics service
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
