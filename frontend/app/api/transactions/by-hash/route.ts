import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@esusu/backend/lib/database/connection';
import { TransactionService } from '@esusu/backend/lib/services/transactionService';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');
    const wallet = (searchParams.get('wallet') || '').toLowerCase();

    if (!hash) {
      return NextResponse.json({ success: false, error: 'Missing hash' }, { status: 400 });
    }

    const tx = await TransactionService.getTransactionByHash(hash);
    if (!tx) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    const txWallet = (((tx as any).user?.walletAddress as string) || '').toLowerCase();
    if (wallet && txWallet !== wallet) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      transaction: {
        transactionHash: tx.transactionHash,
        walletAddress: txWallet || undefined,
        type: tx.type,
        subType: tx.subType,
        amount: tx.amount,
        token: tx.token,
        status: tx.status,
        createdAt: tx.createdAt,
        blockchainStatus: tx.blockchainStatus || undefined,
      }
    });
  } catch (error: any) {
    console.error('[transactions/by-hash] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
