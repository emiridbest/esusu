import { NextRequest, NextResponse } from 'next/server';
import { TransactionService } from '../../../../../backend/lib/services/transactionService';

// Simple in-memory rate limiter and API key check (scoped to this route)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = Number(process.env.RECONCILE_RATE_LIMIT_PER_MINUTE || 5);
const rateMap = new Map<string, { count: number; windowStart: number }>();

function rateLimit(key: string, limit = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW_MS): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    rateMap.set(key, { count: 1, windowStart: now });
    return true;
    }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

function requireApiKey(req: NextRequest): { ok: boolean; error?: string } {
  const required = process.env.CRON_API_KEY || process.env.PAYMENT_API_KEY || process.env.API_KEY;
  if (!required) return { ok: true };
  const header = req.headers.get('x-api-key') || (req.headers.get('authorization')?.replace(/^Bearer\s+/i, ''));
  if (!header || header !== required) return { ok: false, error: 'Unauthorized' };
  return { ok: true };
}

export async function POST(request: NextRequest) {
  // Auth
  const auth = requireApiKey(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  // Global rate limit to avoid hammering provider/DB
  if (!rateLimit('cron:reconcile')) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
  }

  try {
    console.log('[cron/reconcile] Starting reconciliation...');
    await TransactionService.monitorBlockchain();
    console.log('[cron/reconcile] Reconciliation completed.');

    return NextResponse.json({ success: true, message: 'Reconciliation completed' });
  } catch (error: any) {
    console.error('[cron/reconcile] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to run reconciliation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Convenience GET (same as POST) for health checks or manual runs
  return POST(request);
}
