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
    const provider = new ethers.JsonRpcProvider('https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8');
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    try {
      // Get group info to find the creator (admin)
      const groupInfo = await contract.thriftGroups(parseInt(groupId));
      const groupCreator = groupInfo.admin;
      
      // Get all MemberJoined events for this group
      const filter = contract.filters.MemberJoined(parseInt(groupId));
      
      // Try to get events from a recent block range to avoid timeout
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100000); // Last ~100k blocks
      
      console.log(`Querying from block ${fromBlock} to ${currentBlock}`);
      const events = await contract.queryFilter(filter, fromBlock, currentBlock);
      
      console.log(`Found ${events.length} MemberJoined events for group ${groupId}`);
      console.log(`Group creator: ${groupCreator}`);
      
      // Process events to get join dates
      const joinDates: { [address: string]: string } = {};
      
      // First, add the group creator with the group creation time
      if (groupCreator && groupCreator !== ethers.ZeroAddress) {
        try {
          const groupCreationBlock = await provider.getBlock(groupInfo.createdAt);
          const groupCreationDate = new Date(groupCreationBlock.timestamp * 1000);
          joinDates[groupCreator.toLowerCase()] = groupCreationDate.toISOString();
          console.log(`Group creator ${groupCreator} created group on ${groupCreationDate.toISOString()}`);
        } catch (error) {
          console.log(`Error getting group creation time: ${error.message}`);
          // Fallback to current time if we can't get creation time
          joinDates[groupCreator.toLowerCase()] = new Date().toISOString();
        }
      }
      
      // Then process member join events
      for (const event of events) {
        // Type guard to check if event has args (EventLog)
        if ('args' in event && event.args) {
          const eventLog = event as ethers.EventLog;
          const memberAddress = eventLog.args.member;
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