import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { contractAddress, abi } from '@/utils/abi';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('user');
    
    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    // Initialize provider and contract
    const provider = new ethers.JsonRpcProvider('https://celo-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    try {
      // Get group information from smart contract
      const groupInfo = await contract.thriftGroups(groupId);
      const isMember = await contract.isGroupMember(groupId, userAddress);
      
      // Check if group exists (contribution amount > 0)
      const groupExists = groupInfo.contributionAmount > 0;
      
      // Determine if user can join
      const canJoin = groupExists && 
                     groupInfo.isPublic && 
                     groupInfo.totalMembers < groupInfo.maxMembers && 
                     !isMember &&
                     groupInfo.isActive;

      return NextResponse.json({
        success: true,
        groupId: parseInt(groupId),
        userAddress,
        contractAddress,
        groupInfo: {
          exists: groupExists,
          isPublic: groupInfo.isPublic,
          totalMembers: Number(groupInfo.totalMembers),
          maxMembers: Number(groupInfo.maxMembers),
          isActive: groupInfo.isActive,
          contributionAmount: groupInfo.contributionAmount.toString(),
          admin: groupInfo.admin,
          tokenAddress: groupInfo.tokenAddress
        },
        userStatus: {
          isMember,
          canJoin,
          reason: !groupExists ? 'Group not found' :
                  !groupInfo.isPublic ? 'Group is private' :
                  groupInfo.totalMembers >= groupInfo.maxMembers ? 'Group is full' :
                  isMember ? 'Already a member' :
                  !groupInfo.isActive ? 'Group is not active' :
                  'Can join'
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (contractError) {
      console.error('Contract error:', contractError);
      return NextResponse.json({
        success: false,
        error: 'Failed to read from smart contract',
        details: contractError instanceof Error ? contractError.message : String(contractError),
        groupId: parseInt(groupId),
        userAddress,
        contractAddress,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
