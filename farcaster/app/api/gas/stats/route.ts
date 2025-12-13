import { NextRequest, NextResponse } from 'next/server';
import { getGasSponsorshipService } from '@esusu/backend/lib/services/gasSponsorshipService';

// Admin endpoint to get sponsorship statistics
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get('days') || '7');

        const sponsorshipService = getGasSponsorshipService();

        // Get stats
        const stats = await sponsorshipService.getSponsorshipStats(days);

        // Get backend wallet balance
        const walletInfo = await sponsorshipService.getBackendWalletBalance();

        return NextResponse.json({
            success: true,
            stats: {
                ...stats,
                periodDays: days,
            },
            backendWallet: walletInfo,
        });
    } catch (error: any) {
        console.error('Error getting sponsorship stats:', error);
        return NextResponse.json(
            {
                error: 'Failed to get sponsorship statistics',
                details: error.message || 'Unknown error',
            },
            { status: 500 }
        );
    }
}
