import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../lib/database/connection';

export const dynamic = 'force-dynamic';

function stateText(state: number): string {
  switch (state) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}

export async function GET() {
  const startedAt = Date.now();
  try {
    await dbConnect();

    // Try ping to verify responsiveness
    let pingMs: number | null = null;
    try {
      const pingStart = Date.now();
      const admin = mongoose.connection.db?.admin?.();
      if (admin) {
        await admin.ping();
        pingMs = Date.now() - pingStart;
      }
    } catch {
      // ignore ping errors; connection state will still be reported
    }

    const state = mongoose.connection.readyState;
    const payload = {
      ok: true,
      status: 'ok',
      state,
      stateText: stateText(state),
      db: mongoose.connection.db?.databaseName || null,
      pingMs,
      uptimeMs: Date.now() - startedAt,
      time: new Date().toISOString()
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    const payload = {
      ok: false,
      status: 'error',
      error: error?.message || String(error),
      time: new Date().toISOString()
    };
    return NextResponse.json(payload, { status: 500 });
  }
}
