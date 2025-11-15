import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@esusu/backend/lib/database/connection';
import { TransactionService } from '@esusu/backend/lib/services/transactionService';
import { UserService } from '@esusu/backend/lib/services/userService';

// Simple in-memory cache with TTL and in-flight de-duplication
type CacheEntry = { data: any; expiresAt: number; inFlight?: Promise<any> };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15_000; // 15s: recent transactions rarely change more frequently

function makeKey(wallet: string, type?: string, status?: string, limit?: number, offset?: number) {
  return [wallet?.toLowerCase(), type || '', status || '', limit || 50, offset || 0].join('|');
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔍 Transactions API request started');
  
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const typeParam = searchParams.get('type') || undefined;
    const statusParam = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('📋 Request params:', { walletAddress, typeParam, statusParam, limit, offset });

    if (!walletAddress) {
      console.log('❌ Missing wallet address');
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const cacheKey = makeKey(walletAddress, typeParam, statusParam, limit, offset);
    const now = Date.now();
    const existing = cache.get(cacheKey);
    if (existing && existing.expiresAt > now && !existing.inFlight) {
      console.log('⚡ Serving transactions from cache');
      return NextResponse.json({ success: true, transactions: existing.data, total: existing.data.length });
    }

    // De-dupe concurrent identical requests
    if (existing?.inFlight) {
      console.log('⏳ Awaiting in-flight transactions request');
      const data = await existing.inFlight;
      return NextResponse.json({ success: true, transactions: data, total: data.length });
    }

    console.log('🔌 Connecting to database...');
    await dbConnect();
    console.log('✅ Database connected successfully');

    console.log('👤 Looking up user for wallet:', walletAddress.substring(0, 10) + '...');
    const user = await UserService.getUserByWallet(walletAddress);
    
    if (!user) {
      console.log('👤 User not found, returning empty results');
      return NextResponse.json({ success: true, transactions: [], total: 0 });
    }
    
    console.log('👤 User found:', (user as any)._id);

    console.log('📊 Fetching transactions...');
    const inFlight = TransactionService.getUserTransactions(
      walletAddress,
      { type: typeParam, status: statusParam, limit, offset }
    );
    cache.set(cacheKey, { data: null, expiresAt: 0, inFlight });
    const transactions = await inFlight;
    cache.set(cacheKey, { data: transactions, expiresAt: Date.now() + CACHE_TTL_MS });

    const endTime = Date.now();
    console.log(`✅ Transactions API completed in ${endTime - startTime}ms, found ${transactions.length} transactions`);

    return NextResponse.json({
      success: true,
      transactions,
      total: transactions.length
    });

  } catch (error: any) {
    const endTime = Date.now();
    console.error(`❌ Transactions API error after ${endTime - startTime}ms:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // More specific error handling
    if (error.name === 'MongooseServerSelectionError') {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 503 }
      );
    }
    
    if (error.name === 'MongooseTimeoutError') {
      return NextResponse.json(
        { success: false, error: 'Database query timeout' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { 
      walletAddress, 
      transactionHash, 
      type, 
      subType, 
      amount, 
      token,
      utilityDetails,
      groupDetails,
      aaveDetails 
    } = body;

    if (!walletAddress || !transactionHash || !type || !amount || !token) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if transaction hash is already used
    const existingTransaction = await TransactionService.getTransactionByHash(transactionHash);
    if (existingTransaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction hash already exists' },
        { status: 409 }
      );
    }

    const transaction = await TransactionService.createTransaction({
      walletAddress,
      transactionHash,
      type,
      subType,
      amount,
      token,
      utilityDetails,
      groupDetails,
      aaveDetails
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: (transaction as any)._id,
        transactionHash: transaction.transactionHash,
        type: transaction.type,
        subType: transaction.subType,
        amount: transaction.amount,
        token: transaction.token,
        status: transaction.status,
        createdAt: transaction.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
