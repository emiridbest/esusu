import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@esusu/backend/lib/database/connection';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/groups/[groupId]/members - Get group members with join dates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Since groupId is a string (like "1"), we need to find by groupId field, not _id
    const group = await mongoose.connection.db?.collection('groups').findOne({ groupId: parseInt(groupId) });
    
    console.log('📤 GET /api/groups/[groupId]/members - Found group:', {
      groupId,
      groupExists: !!group,
      memberCount: group?.members?.length || 0
    });

    if (!group) {
      console.log(`⚠️ Group ${groupId} not found in database`);
      return NextResponse.json(
        { members: [] }, // Return empty array instead of error for better UX
        { status: 200 }
      );
    }

    // Return members with join dates and names
    const members = (group.members || []).map((member: any, index: number) => {
      console.log(`👤 Member ${index + 1}:`, {
        address: member.user,
        userName: member.userName,
        role: member.role
      });
      
      return {
        address: member.user, // This is the wallet address
        userName: member.userName, // Don't fallback here, let frontend handle it
        joinedAt: member.joinedAt,
        role: member.role,
        isActive: member.isActive
      };
    });

    console.log('📤 Returning members:', members.length);

    return NextResponse.json({ members });

  } catch (error: any) {
    console.error('Error fetching group members:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch group members' },
      { status: 500 }
    );
  }
}

// POST /api/groups/[groupId]/members - Add member to group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const body = await request.json();
    const { userAddress, role = 'member', joinDate, userName } = body;

    console.log('📥 POST /api/groups/[groupId]/members - Received:', {
      groupId,
      userAddress,
      role,
      userName,
      joinDate
    });

    if (!groupId || !userAddress) {
      return NextResponse.json(
        { error: 'Group ID and user address are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the group by groupId field
    let group = await mongoose.connection.db?.collection('groups').findOne({ groupId: parseInt(groupId) });
    
    // If group doesn't exist, create it (this happens when creator creates group on blockchain)
    if (!group) {
      console.log(`📝 Group ${groupId} doesn't exist in DB yet, creating it...`);
      
      const newGroupDoc = {
        groupId: parseInt(groupId),
        name: `Thrift Group ${groupId}`, // Will be updated by metadata API
        description: '',
        members: [],
        settings: {
          contributionAmount: 0,
          contributionToken: 'CELO',
          contributionInterval: 'monthly',
          startDate: new Date(),
          maxMembers: 5
        },
        currentRound: 0,
        status: 'forming',
        payoutSchedule: [],
        totalContributions: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await mongoose.connection.db?.collection('groups').insertOne(newGroupDoc);
      group = newGroupDoc as any;
      console.log('✅ Group document created in database');
    }

    // Check if user is already a member
    const existingMember = (group.members || []).find(
      (member: any) => member.user === userAddress
    );

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this group' },
        { status: 400 }
      );
    }

    // Use blockchain timestamp if provided, otherwise fall back to current time
    const actualJoinDate = joinDate ? new Date(joinDate) : new Date();
    
    // Add member with blockchain timestamp and name
    const newMember = {
      user: userAddress,
      userName: userName || `Member ${Date.now()}`, // Fallback name if not provided
      joinedAt: actualJoinDate,
      role,
      isActive: true
    };

    console.log('💾 Storing member in database:', {
      groupId,
      member: newMember
    });

    // Update the group with the new member
    const updateResult = await mongoose.connection.db?.collection('groups').updateOne(
      { groupId: parseInt(groupId) },
      { $push: { members: newMember } as any }
    );

    console.log('✅ Database update result:', {
      matchedCount: updateResult?.matchedCount,
      modifiedCount: updateResult?.modifiedCount
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Member added successfully',
      member: newMember
    });

  } catch (error: any) {
    console.error('Error adding member to group:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to add member to group' },
      { status: 500 }
    );
  }
}
