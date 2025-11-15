import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../backend/lib/database/connection';
import { AnalyticsService } from '../../../../backend/lib/services/analyticsService';
import { UserService } from '../../../../backend/lib/services/userService';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const type = searchParams.get('type') || 'user'; // 'user' or 'platform'

    if (type === 'platform') {
      // Get platform-wide analytics
      const platformAnalytics = await AnalyticsService.getPlatformAnalytics();
      
      return NextResponse.json({
        success: true,
        type: 'platform',
        data: platformAnalytics
      });
    }

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required for user dashboard' },
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

    // Get comprehensive user dashboard data
    const dashboardData = await AnalyticsService.getUserDashboard(walletAddress);

    return NextResponse.json({
      success: true,
      type: 'user',
      walletAddress,
      data: dashboardData
    });

  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
