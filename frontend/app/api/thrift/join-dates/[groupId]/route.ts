import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { contractAddress, abi } from '@/utils/abi';

export const dynamic = 'force-dynamic';

// GET /api/thrift/join-dates/[groupId] - Get join dates from blockchain events
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

    // Initialize provider and contract
    const provider = new ethers.JsonRpcProvider('https://celo-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    try {
      // Get all MemberJoined events for this group
      const filter = contract.filters.MemberJoined(parseInt(groupId));
      const events = await contract.queryFilter(filter);
      
      console.log(`Found ${events.length} MemberJoined events for group ${groupId}`);
      
      // Process events to get join dates
      const joinDates: { [address: string]: string } = {};
      
      for (const event of events) {
        if (event.args) {
          const memberAddress = event.args.member;
          const block = await provider.getBlock(event.blockNumber);
          const joinDate = new Date(block.timestamp * 1000);
          
          joinDates[memberAddress.toLowerCase()] = joinDate.toISOString();
          console.log(`Member ${memberAddress} joined on ${joinDate.toISOString()}`);
        }
      }
      
      return NextResponse.json({
        success: true,
        groupId: parseInt(groupId),
        joinDates,
        eventCount: events.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (contractError) {
      console.error('Contract error:', contractError);
      return NextResponse.json({
        success: false,
        error: 'Failed to read blockchain events',
        details: contractError instanceof Error ? contractError.message : String(contractError),
        groupId: parseInt(groupId),
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Join dates endpoint error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
