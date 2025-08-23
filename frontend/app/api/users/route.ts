import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../../backend/lib/database/connection';
import { UserService } from '../../../../backend/lib/services/userService';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    
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

    return NextResponse.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        profileData: user.profileData,
        savings: user.savings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Error fetching user:', error);
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
    const { walletAddress, profileData } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const user = await UserService.createOrUpdateUser(
      walletAddress,
      {
        profileData
      }
    );

    return NextResponse.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        profileData: user.profileData,
        savings: user.savings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Error creating/updating user:', error);
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
    const { walletAddress, profileData } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const updatedUser = await UserService.updateUserProfile(walletAddress, {
      firstName: profileData?.firstName,
      lastName: profileData?.lastName,
      email: body.email,
      phone: body.phone,
      country: profileData?.country,
      preferredCurrency: profileData?.preferredCurrency
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        walletAddress: updatedUser.walletAddress,
        profileData: updatedUser.profileData,
        savings: updatedUser.savings,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });

  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
