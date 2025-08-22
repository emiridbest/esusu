import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../../backend/lib/database/connection';
import { TransactionService } from '../../../../../backend/lib/services/transactionService';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { transactionHash } = body;

    if (!transactionHash) {
      return NextResponse.json(
        { success: false, error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    // Check if the transaction hash has already been used
    const isHashUsed = await TransactionService.isPaymentHashUsed(transactionHash);

    if (isHashUsed) {
      return NextResponse.json({
        success: false,
        isUsed: true,
        error: 'Transaction hash has already been used'
      }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      isUsed: false,
      message: 'Transaction hash is valid and unused'
    });

  } catch (error: any) {
    console.error('Error validating payment hash:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { transactionHash, walletAddress, amount, token } = body;

    if (!transactionHash || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Transaction hash and wallet address are required' },
        { status: 400 }
      );
    }

    // Record the payment hash to prevent reuse
    await TransactionService.recordPaymentHash(transactionHash, {
      walletAddress,
      amount,
      token,
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Payment hash recorded successfully'
    });

  } catch (error: any) {
    console.error('Error recording payment hash:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
