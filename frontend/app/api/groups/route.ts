import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../backend/lib/database/connection';
import { GroupService } from '../../../../backend/lib/services/groupService';
import { UserService } from '../../../../backend/lib/services/userService';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

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

    let groups: any[] = await GroupService.getUserGroups(walletAddress) as any[];
    if (status && ['forming','active','completed','paused'].includes(status)) {
      groups = groups.filter((g: any) => g.status === status);
    }
    if (Number.isFinite(limit) && limit > 0) {
      groups = groups.slice(0, limit);
    }

    return NextResponse.json({
      success: true,
      groups
    });

  } catch (error: any) {
    console.error('Error fetching groups:', error);
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
      name, 
      description,
      contributionAmount,
      contributionToken,
      payoutFrequency 
    } = body;

    if (!walletAddress || !name || !contributionAmount || !contributionToken) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
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

    const contributionInterval = (payoutFrequency === 'monthly' ? 'monthly' : 'weekly') as 'weekly' | 'monthly';
    const group = await GroupService.createGroup({
      name,
      description,
      creatorWallet: walletAddress,
      contributionAmount,
      contributionToken,
      contributionInterval,
      startDate: new Date()
    });

    return NextResponse.json({
      success: true,
      group: {
        id: (group as any)._id,
        name: group.name,
        description: group.description,
        status: group.status,
        settings: group.settings,
        members: group.members,
        createdAt: group.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
