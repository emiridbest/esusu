import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/../backend/lib/database/connection';
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
    
    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Return members with join dates and names
    const members = (group.members || []).map((member: any) => ({
      address: member.user, // This should be the wallet address
      userName: member.userName || `Member ${Math.random().toString(36).substr(2, 9)}`, // Fallback name
      joinedAt: member.joinedAt,
      role: member.role,
      isActive: member.isActive
    }));

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

    if (!groupId || !userAddress) {
      return NextResponse.json(
        { error: 'Group ID and user address are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find the group by groupId field
    const group = await mongoose.connection.db?.collection('groups').findOne({ groupId: parseInt(groupId) });
    
    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
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

    console.log(`Adding member ${userAddress} to group ${groupId} with join date: ${actualJoinDate.toISOString()}`);

    // Update the group with the new member
    await mongoose.connection.db?.collection('groups').updateOne(
      { groupId: parseInt(groupId) },
      { $push: { members: newMember } as any }
    );

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
