import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@esusu/backend/lib/database/connection';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/debug/group-members?groupId=2 - Debug group members data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
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

    // Return raw group data for debugging
    return NextResponse.json({ 
      groupId: parseInt(groupId),
      rawGroup: group,
      members: group.members || [],
      memberCount: (group.members || []).length
    });

  } catch (error: any) {
    console.error('Error debugging group members:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to debug group members' },
      { status: 500 }
    );
  }
}
