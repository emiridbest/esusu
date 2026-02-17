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

    // Initialize provider with Ankr endpoint
    const rpcUrls = [
      'https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8',
    ];
    
    let provider;
    let lastError;
    
    // Try each RPC URL until one works
    for (const rpcUrl of rpcUrls) {
      try {
        provider = new ethers.JsonRpcProvider(rpcUrl, {
          name: 'celo',
          chainId: 42220,
          ensAddress: null
        });
        
        // Test the connection
        await provider.getNetwork();
        break;
      } catch (error) {
        console.warn(`Failed to connect to RPC ${rpcUrl}:`, error);
        lastError = error;
        continue;
      }
    }
    
    if (!provider) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to any Celo RPC provider',
        details: lastError instanceof Error ? lastError.message : String(lastError),
        triedUrls: rpcUrls
      }, { status: 500 });
    }
    
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    // Verify contract exists and is not paused
    try {
      const contractCode = await provider.getCode(contractAddress);
      if (contractCode === '0x') {
        return NextResponse.json({
          success: false,
          error: 'Contract not deployed at this address',
          contractAddress,
          groupId: parseInt(groupId),
          userAddress
        }, { status: 400 });
      }
      
      // Check if contract is paused
      const isPaused = await contract.paused();
      if (isPaused) {
        return NextResponse.json({
          success: false,
          error: 'Contract is currently paused',
          contractAddress,
          groupId: parseInt(groupId),
          userAddress
        }, { status: 400 });
      }
      
    } catch (verifyError) {
      console.error('Contract verification failed:', verifyError);
      return NextResponse.json({
        success: false,
        error: 'Failed to verify contract',
        details: verifyError instanceof Error ? verifyError.message : String(verifyError),
        contractAddress,
        groupId: parseInt(groupId),
        userAddress
      }, { status: 500 });
    }
    
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
