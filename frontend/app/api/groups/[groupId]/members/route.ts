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
    const searchParams = request.nextUrl.searchParams;
    const contract = searchParams.get('contract');

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Query by groupId AND contractAddress if provided
    const query: any = { groupId: parseInt(groupId) };
    if (contract) {
      query.contractAddress = contract.toLowerCase();
    }

    // Find the group
    const group = await mongoose.connection.db?.collection('groups').findOne(query);

    console.log('📤 GET /api/groups/[groupId]/members - Found group:', {
      groupId,
      contract,
      groupExists: !!group,
      memberCount: group?.members?.length || 0
    });

    if (!group) {
      console.log(`⚠️ Group ${groupId} (contract: ${contract || 'all'}) not found in database`);
      return NextResponse.json(
        { members: [] }, // Return empty array instead of error for better UX
        { status: 200 }
      );
    }

    // Fetch all user profiles for these members to get the latest names
    const memberAddresses = (group.members || []).map((m: any) => m.user);
    const users = await mongoose.connection.db?.collection('users')
      .find({ address: { $in: memberAddresses } })
      .toArray();

    // Create a map for quick user lookup
    const userMap = new Map(users?.map((u: any) => [u.address, u]));

    // Return members with join dates and names
    const members = (group.members || []).map((member: any, index: number) => {
      const userProfile = userMap.get(member.user);
      const displayName = member.userName || userProfile?.name;

      console.log(`👤 Member ${index + 1}:`, {
        address: member.user,
        rawName: member.userName,
        profileName: userProfile?.name,
        finalName: displayName,
        role: member.role
      });

      return {
        address: member.user, // This is the wallet address
        userName: displayName, // Use global profile name if available, fallback to group name
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

    const { userAddress, role = 'member', joinDate, userName, contractAddress } = body;

    console.log('📥 POST /api/groups/[groupId]/members - Received:', {
      groupId,
      contractAddress,
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

    // 1. Update/Create Global User Profile
    if (userName || userAddress) { // Allow update if we have address
      try {
        const updateData: any = {
          updatedAt: new Date()
        };

        if (userName) updateData.name = userName;
        if (body.email) updateData.email = body.email;
        if (body.phone) updateData.phone = body.phone;

        await mongoose.connection.db?.collection('users').updateOne(
          { address: userAddress },
          {
            $set: updateData,
            $setOnInsert: {
              address: userAddress,
              createdAt: new Date(),
              email: body.email || '',
              phone: body.phone || ''
            }
          },
          { upsert: true }
        );
        console.log(`✅ User profile updated for ${userAddress}`);
      } catch (err) {
        console.error('Failed to update user profile:', err);
      }
    }

    // Import NotificationService dynamically using relative path to backend
    // Path: frontend/app/api/groups/[groupId]/members/route.ts -> backend/lib/services/notificationService
    const { NotificationService } = await import('../../../../../../backend/lib/services/notificationService').catch((e) => {
      console.error('Failed to import NotificationService:', e);
      return { NotificationService: null };
    });

    // Send Welcome Email if we have an email
    if (body.email && NotificationService) {
      try {
        // Determine if this is a join or create action based on role
        // 'creator' role is set in ThriftContext when creating a group
        const isCreator = role === 'creator';
        const title = isCreator ? 'Thrift Group Created Successfully' : 'Joined Thrift Group Successfully';
        const message = isCreator
          ? `You have successfully created the thrift group. Invite others to join!`
          : `You have successfully joined the thrift group.`;

        // Determine App URL from request
        const appUrl = request.nextUrl.origin;

        await NotificationService.createNotification({
          userWallet: userAddress,
          type: 'group_invitation',
          title: title,
          message: message,
          data: { groupId, role },
          sendEmail: true,
          appName: 'Esusu App',
          appUrl: appUrl
        });
        console.log(`📧 Email notification queued for ${body.email}`);
      } catch (emailErr) {
        console.error('Failed to send email notification:', emailErr);
      }
    }

    // 2. Find or Create Group (scoped by contract address)
    const query: any = { groupId: parseInt(groupId) };
    if (contractAddress) {
      query.contractAddress = contractAddress.toLowerCase();
    }

    let group = await mongoose.connection.db?.collection('groups').findOne(query);

    // If group doesn't exist, create it (this happens when creator creates group on blockchain)
    if (!group) {
      console.log(`📝 Group ${groupId} doesn't exist in DB yet, creating it...`);

      const newGroupDoc = {
        groupId: parseInt(groupId),
        contractAddress: contractAddress ? contractAddress.toLowerCase() : null, // Store contract address!
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
      // Even if member exists, we might want to update their role or name reference
      // But usually this means duplicate join attempt
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
      contractAddress,
      member: newMember
    });

    // Update the group with the new member
    const updateResult = await mongoose.connection.db?.collection('groups').updateOne(
      { _id: group._id }, // Use _id to ensure we match the exact document found/created above
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
