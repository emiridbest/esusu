import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../backend/lib/database/connection';
import { AnalyticsService } from '../../../../backend/lib/services/analyticsService';
import { UserService } from '../../../../backend/lib/services/userService';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' | 'yearly' || 'monthly';
    const limit = parseInt(searchParams.get('limit') || '12');

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get analytics history for the user
    const analyticsHistory = await AnalyticsService.getUserAnalyticsHistory(
      walletAddress, 
      period, 
      limit
    );

    return NextResponse.json({
      success: true,
      period,
      analytics: analyticsHistory
    });

  } catch (error: any) {
    console.error('Error fetching analytics:', error);
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
    const { walletAddress, period, date } = body;

    if (!walletAddress || !period) {
      return NextResponse.json(
        { success: false, error: 'Wallet address and period are required' },
        { status: 400 }
      );
    }

    const user = await UserService.getUserByWallet(walletAddress);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate analytics for the specified period and date
    const analytics = await AnalyticsService.generateUserAnalytics(
      walletAddress,
      period as 'daily' | 'weekly' | 'monthly' | 'yearly',
      date ? new Date(date) : new Date()
    );

    return NextResponse.json({
      success: true,
      analytics
    });

  } catch (error: any) {
    console.error('Error generating analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
