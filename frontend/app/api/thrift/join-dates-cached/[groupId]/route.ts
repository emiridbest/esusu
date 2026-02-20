import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import dbConnect from '@/../../backend/lib/database/connection';
import { MemberJoinDate, BlockchainSyncState } from '@/../../backend/lib/database/schemas';
import { contractAddress, abi } from '@/utils/abi';

const CELO_RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo.org';
const CHUNK_SIZE = 5000; // Blocks per RPC query
const MAX_BLOCKS_TO_SYNC = 2000000; // ~4 months on Celo (expanded to find older groups)

/**
 * GET /api/thrift/join-dates-cached/[groupId]
 * 
 * Fetches member join dates with intelligent caching:
 * 1. Check MongoDB cache first
 * 2. If incomplete, sync from blockchain
 * 3. Store in MongoDB
 * 4. Return complete join dates
 * 
 * Query params:
 * - force: boolean - Force re-sync from blockchain
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    await dbConnect();
    const { groupId: groupIdStr } = await params;
    const groupId = parseInt(groupIdStr);
    
    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const forceSync = searchParams.get('force') === 'true';


    // Initialize RPC provider
    const provider = new ethers.JsonRpcProvider(CELO_RPC_URL);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const currentBlock = await provider.getBlockNumber();

    // Step 1: Get cached join dates from MongoDB
    let cachedJoinDates: any[] = [];
    if (!forceSync) {
      // @ts-ignore - Mongoose type conflict
      cachedJoinDates = await MemberJoinDate.find({ groupId })
        .sort({ joinDate: 1 })
        .lean();
      
    }

    // Step 2: Check if we need to sync from blockchain
    // @ts-ignore - Mongoose type conflict
    let syncState = await BlockchainSyncState.findOne({ 
      groupId, 
      contractAddress,
      // Use a different identifier for join dates sync
    });
    
    let needsSync = forceSync || !syncState || cachedJoinDates.length === 0;

    // Step 3: Sync from blockchain if needed
    if (needsSync) {
      
      // Get group info to find creator
      const groupInfo = await contract.thriftGroups(groupId);
      const groupCreator = groupInfo.admin;
      const startDateTimestamp = Number(groupInfo.startDate);
      

      // Get ACTUAL creation date from ThriftGroupCreated event
      let creationDate = new Date();
      let creationBlock = currentBlock;
      let creationTxHash = '';
      
      try {
        const creationFilter = contract.filters.ThriftGroupCreated(groupId);
        const fromBlock = Math.max(0, currentBlock - MAX_BLOCKS_TO_SYNC);
        const creationEvents = await contract.queryFilter(creationFilter, fromBlock, currentBlock);
        
        if (creationEvents.length > 0) {
          const creationEvent = creationEvents[0]; // First event is the creation
          const block = await provider.getBlock(creationEvent.blockNumber);
          
          if (block) {
            creationDate = new Date(block.timestamp * 1000);
            creationBlock = creationEvent.blockNumber;
            creationTxHash = creationEvent.transactionHash;
            
          }
        } else {
          console.warn('[JoinDates] No ThriftGroupCreated event found, using startDate as fallback');
          creationDate = new Date(startDateTimestamp * 1000);
        }
      } catch (eventError) {
        console.warn('[JoinDates] Error querying creation event:', eventError);
        console.warn('[JoinDates] Using startDate as fallback');
        creationDate = new Date(startDateTimestamp * 1000);
      }

      // Store creator's join date (ACTUAL group creation date from event)
      await storeMemberJoinDate({
        groupId,
        memberAddress: groupCreator.toLowerCase(),
        joinDate: creationDate,
        joinBlockNumber: creationBlock,
        joinTransactionHash: creationTxHash,
        isCreator: true,
        eventData: { 
          source: 'ThriftGroupCreated_event', 
          admin: groupCreator,
          scheduledStartDate: new Date(startDateTimestamp * 1000).toISOString(),
          actualCreationDate: creationDate.toISOString()
        }
      });

      // Query MemberJoined events with pagination
      const fromBlock = Math.max(0, currentBlock - MAX_BLOCKS_TO_SYNC);
      const toBlock = currentBlock;
      
      
      const joinEvents = await fetchJoinEventsWithPagination(
        contract,
        groupId,
        fromBlock,
        toBlock,
        provider
      );


      // Store join events in MongoDB
      for (const event of joinEvents) {
        await storeMemberJoinDate({
          groupId,
          memberAddress: event.memberAddress.toLowerCase(),
          joinDate: event.joinDate,
          joinBlockNumber: event.blockNumber,
          joinTransactionHash: event.transactionHash,
          isCreator: false,
          eventData: event.eventData
        });
      }

      // Update sync state
      // @ts-ignore - Mongoose type conflict
      await BlockchainSyncState.findOneAndUpdate(
        { groupId, contractAddress },
        {
          groupId,
          contractAddress,
          lastSyncedBlock: toBlock,
          lastSyncedAt: new Date()
        },
        { upsert: true }
      );

      // Fetch all join dates from DB (cached + newly synced)
      // @ts-ignore - Mongoose type conflict
      const allJoinDates = await MemberJoinDate.find({ groupId })
        .sort({ joinDate: 1 })
        .lean();

      return NextResponse.json({
        success: true,
        groupId,
        joinDates: formatJoinDates(allJoinDates),
        cached: false,
        syncedNewMembers: joinEvents.length + 1, // +1 for creator
        lastSyncedBlock: toBlock,
        currentBlock
      });
    }

    // Return cached data
    return NextResponse.json({
      success: true,
      groupId,
      joinDates: formatJoinDates(cachedJoinDates),
      cached: true,
      lastSyncedBlock: syncState?.lastSyncedBlock || 0,
      currentBlock
    });

  } catch (error: any) {
    console.error('[JoinDates] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch join dates',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch MemberJoined events with pagination
 */
async function fetchJoinEventsWithPagination(
  contract: ethers.Contract,
  groupId: number,
  fromBlock: number,
  toBlock: number,
  provider: ethers.JsonRpcProvider
): Promise<any[]> {
  const allEvents: any[] = [];
  const filter = contract.filters.MemberJoined(groupId);

  // Paginate through blocks in chunks
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, toBlock);
    
    try {
      const events = await contract.queryFilter(filter, start, end);
      
      // Get timestamps for each event
      for (const event of events) {
        try {
          const block = await provider.getBlock(event.blockNumber);
          const eventLog = event as ethers.EventLog;
          
          allEvents.push({
            memberAddress: eventLog.args.member,
            joinDate: block ? new Date(block.timestamp * 1000) : new Date(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            eventData: {
              member: eventLog.args.member,
              groupId: eventLog.args.groupId?.toString(),
              event: eventLog.fragment?.name || 'MemberJoined'
            }
          });
        } catch (err) {
          console.error(`Failed to process event:`, err);
        }
      }

      
      // Small delay to avoid rate limiting
      if (end < toBlock) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      console.error(`[JoinDatesPagination] Error fetching blocks ${start}-${end}:`, error.message);
      continue;
    }
  }

  return allEvents;
}

/**
 * Store member join date in MongoDB
 * - For creators: Force update to ensure we have the correct ThriftGroupCreated event date
 * - For members: Use $setOnInsert to avoid overwriting existing data
 */
async function storeMemberJoinDate(data: {
  groupId: number;
  memberAddress: string;
  joinDate: Date;
  joinBlockNumber: number;
  joinTransactionHash?: string;
  isCreator: boolean;
  eventData?: any;
}): Promise<void> {
  try {
    // For creators, use $set to force update with correct blockchain event date
    // For members, use $setOnInsert to preserve original join date
    const updateOperation = data.isCreator
      ? {
          $set: {
            joinDate: data.joinDate,
            joinBlockNumber: data.joinBlockNumber,
            joinTransactionHash: data.joinTransactionHash,
            isCreator: data.isCreator,
            eventData: data.eventData
          },
          $setOnInsert: {
            groupId: data.groupId,
            memberAddress: data.memberAddress.toLowerCase()
          }
        }
      : {
          $setOnInsert: {
            groupId: data.groupId,
            memberAddress: data.memberAddress.toLowerCase(),
            joinDate: data.joinDate,
            joinBlockNumber: data.joinBlockNumber,
            joinTransactionHash: data.joinTransactionHash,
            isCreator: data.isCreator,
            eventData: data.eventData
          }
        };

    // @ts-ignore - Mongoose type conflict
    await MemberJoinDate.findOneAndUpdate(
      {
        groupId: data.groupId,
        memberAddress: data.memberAddress.toLowerCase()
      },
      updateOperation,
      { upsert: true }
    );
  } catch (error: any) {
    // Ignore duplicate key errors
    if (error.code !== 11000) {
      console.error('[MongoDB] Error storing join date:', error);
    }
  }
}

/**
 * Format join dates for frontend consumption
 */
function formatJoinDates(joinDates: any[]): { [address: string]: string } {
  const formatted: { [address: string]: string } = {};
  
  joinDates.forEach((record: any) => {
    formatted[record.memberAddress] = record.joinDate instanceof Date 
      ? record.joinDate.toISOString() 
      : record.joinDate;
  });
  
  return formatted;
}
