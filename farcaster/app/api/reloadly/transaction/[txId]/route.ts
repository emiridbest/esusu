import { NextRequest, NextResponse } from 'next/server';
import { getTransactionStatus } from '../../../../../services/utility/api';



export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  let txId: string | null;
  
  try {
    const { searchParams } = new URL(req.url);
    txId = searchParams.get('txId');
    
    if (!txId) {
    
      return NextResponse.json(
        { error: 'Invalid transaction ID. Please provide a valid numeric ID.' },
        { status: 400 }
      );
    }
    
    // Get transaction status
    const transaction = await getTransactionStatus(parseInt(txId));
    
    return NextResponse.json(transaction);
  } catch (error: any) {
    console.error(`Error fetching transaction status for ${txId}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transaction status' },
      { status: error.response?.status || 500 }
    );
  }
}