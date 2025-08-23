import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../backend/lib/database/connection';
import { TransactionService } from '../../../../backend/lib/services/transactionService';
import { UserService } from '../../../../backend/lib/services/userService';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const typeParam = searchParams.get('type') || undefined;
    const statusParam = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json({ success: true, transactions: [], total: 0 });
    }

    const transactions = await TransactionService.getUserTransactions(
      walletAddress,
      { type: typeParam, status: statusParam, limit, offset }
    );

    return NextResponse.json({
      success: true,
      transactions,
      total: transactions.length
    });

  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
