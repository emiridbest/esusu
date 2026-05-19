import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { CashbackService } from '@esusu/backend/lib/services/cashbackService';

// Simple in-memory rate limiter (per wallet, 10 req/min)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateMap = new Map<string, { count: number; windowStart: number }>();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX;
}

/**
 * POST /api/cashback
 *
 * Called by the frontend immediately after a confirmed G$ utility payment.
 * Triggers Esusu's 10% cashback via CashBackVault and notifies G$ for their
 * matching 10% — delivering 20% total cashback to the user in G$ tokens.
 *
 * Body: {
 *   sourceTxHash: string,      // on-chain tx hash of the utility payment
 *   userAddress:  string,      // beneficiary wallet address
 *   paymentAmountGD: number,   // amount of G$ paid (human-readable, 18-decimal)
 *   utilityType: 'airtime' | 'data' | 'electricity' | 'cable'
 * }
 */
export async function POST(req: NextRequest) {
  let body: {
    sourceTxHash?: unknown;
    userAddress?: unknown;
    paymentAmountGD?: unknown;
    utilityType?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sourceTxHash, userAddress, paymentAmountGD, utilityType } = body;

  // --- Input validation ---
  if (
    typeof sourceTxHash !== 'string' ||
    !/^0x[0-9a-fA-F]{64}$/.test(sourceTxHash)
  ) {
    return NextResponse.json(
      { error: 'sourceTxHash must be a valid 0x-prefixed 32-byte hex string' },
      { status: 400 }
    );
  }

  if (typeof userAddress !== 'string' || !isAddress(userAddress)) {
    return NextResponse.json(
      { error: 'userAddress must be a valid Ethereum address' },
      { status: 400 }
    );
  }

  if (
    typeof paymentAmountGD !== 'number' ||
    !isFinite(paymentAmountGD) ||
    paymentAmountGD < 300
  ) {
    return NextResponse.json(
      { error: 'paymentAmountGD must be a number >= 300 G$' },
      { status: 400 }
    );
  }

  const validUtilityTypes = ['airtime', 'data', 'electricity', 'cable'] as const;
  if (!validUtilityTypes.includes(utilityType as any)) {
    return NextResponse.json(
      { error: `utilityType must be one of: ${validUtilityTypes.join(', ')}` },
      { status: 400 }
    );
  }

  // Rate limit per wallet
  if (!rateLimit(userAddress.toLowerCase())) {
    return NextResponse.json(
      { error: 'Too many cashback requests. Please wait a moment.' },
      { status: 429 }
    );
  }

  try {
    const service = new CashbackService();
    const result = await service.processCashback({
      sourceTxHash,
      userAddress,
      paymentAmountGD,
      utilityType: utilityType as 'airtime' | 'data' | 'electricity' | 'cable',
    });

    if (!result.success) {
      if (result.ineligible) {
        // Payment below 300 G$ minimum — not an error, just ineligible
        return NextResponse.json({ success: false, ineligible: true });
      }
      console.error('[/api/cashback] Cashback processing failed:', result.error);
      return NextResponse.json(
        { error: result.error ?? 'Cashback processing failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed ?? false,
      cashback: {
        cashbackAmountGD: result.cashbackAmountGD,
        cashbackTxHash: result.cashbackTxHash,
      },
    });
  } catch (err) {
    console.error('[/api/cashback] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cashback?wallet=0x...&limit=20
 *
 * Returns cashback history for the given wallet address, shaped as ReceiptTx
 * records so they can be merged directly into receipt lists.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet') ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);

  if (!isAddress(wallet)) {
    return NextResponse.json({ error: 'wallet must be a valid address' }, { status: 400 });
  }

  try {
    const service = new CashbackService();
    const records = await service.getCashbackHistory(wallet, limit);

    const transactions = records.map((r: any) => ({
      transactionHash: r.cashbackTxHash ?? r.sourceTxHash,
      type: 'cashback' as const,
      subType: r.utilityType,
      amount: r.cashbackAmountGD,
      token: 'G$',
      status: r.status === 'sent' ? 'completed' : r.status,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ success: true, transactions });
  } catch (err) {
    console.error('[/api/cashback GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
