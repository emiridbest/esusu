import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import dbConnect from '@/../../backend/lib/database/connection';
import { ContributionEvent, BlockchainSyncState } from '@/../../backend/lib/database/schemas';
import { contractAddress, abi } from '@/utils/abi';
import { getTokenByAddress } from '@/utils/tokens';

const CELO_RPC_URL = process.env.CELO_RPC_URL || 'https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8';
const CHUNK_SIZE = 5000; // Blocks per RPC query (industry best practice)
const MAX_BLOCKS_TO_SYNC = 500000; // ~1 month on Celo

/**
 * GET /api/thrift/contributions/[groupId]
 * 
 * Fetches contribution history for a group with intelligent caching:
 * 1. Check MongoDB cache first
 * 2. If data is incomplete, sync from blockchain (paginated)
 * 3. Store new events in MongoDB
 * 4. Return complete history
 * 
 * Query params:
 * - force: boolean - Force re-sync from blockchain
 * - fromBlock: number - Optional custom start block
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
    const customFromBlock = searchParams.get('fromBlock');

    // Initialize RPC provider
    const provider = new ethers.JsonRpcProvider(CELO_RPC_URL);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const currentBlock = await provider.getBlockNumber();

    // Get group token info for formatting amounts
    let tokenDecimals = 18; // Default to 18
    let tokenSymbol = 'CELO';
    try {
      const groupInfo = await contract.thriftGroups(groupId); // Correct function name
      const tokenAddress = groupInfo.tokenAddress; // tokenAddress is at index 9
      const tokenConfig = getTokenByAddress(tokenAddress);
      if (tokenConfig) {
        tokenDecimals = tokenConfig.decimals;
        tokenSymbol = tokenConfig.symbol;
      }
    } catch (tokenError) {
      console.warn('[ContributionHistory] Could not fetch token info:', tokenError);
    }

    // Step 1: Get cached events from MongoDB
    let cachedEvents: any[] = [];
    if (!forceSync) {
      // @ts-ignore - Mongoose type conflict in Next.js API route
      cachedEvents = await ContributionEvent.find({ groupId })
        .sort({ timestamp: -1 })
        .lean();

    }

    // Step 2: Determine if we need to sync from blockchain
    // @ts-ignore - Mongoose type conflict in Next.js API route
    let syncState = await BlockchainSyncState.findOne({ groupId, contractAddress });
    let needsSync = forceSync || !syncState;
    let startBlock = customFromBlock ? parseInt(customFromBlock) : 0;

    if (syncState && !forceSync) {
      // Only sync new blocks since last sync
      startBlock = syncState.lastSyncedBlock + 1;
      // If we're up to date, return cached data
      if (startBlock >= currentBlock) {
        return NextResponse.json({
          success: true,
          contributions: formatContributions(cachedEvents, tokenDecimals, tokenSymbol),
          cached: true,
          lastSyncedBlock: syncState.lastSyncedBlock,
          currentBlock
        });
      }
      needsSync = true;
    }

    // Step 3: Sync from blockchain with pagination if needed
    if (needsSync) {
      const fromBlock = Math.max(startBlock, currentBlock - MAX_BLOCKS_TO_SYNC);
      const toBlock = currentBlock;


      const newEvents = await fetchEventsWithPagination(
        contract,
        groupId,
        fromBlock,
        toBlock,
        provider
      );


      // Step 4: Store new events in MongoDB
      if (newEvents.length > 0) {
        await storeEvents(newEvents, groupId);
      }

      // Step 5: Update sync state
      // @ts-ignore - Mongoose type conflict in Next.js API route
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

      // Step 6: Fetch all events from DB (cached + newly synced)
      // @ts-ignore - Mongoose type conflict in Next.js API route
      const allEvents = await ContributionEvent.find({ groupId })
        .sort({ timestamp: -1 })
        .lean();

      return NextResponse.json({
        success: true,
        contributions: formatContributions(allEvents, tokenDecimals, tokenSymbol),
        cached: false,
        syncedNewEvents: newEvents.length,
        lastSyncedBlock: toBlock,
        currentBlock
      });
    }

    // Return cached data
    return NextResponse.json({
      success: true,
      contributions: formatContributions(cachedEvents, tokenDecimals, tokenSymbol),
      cached: true,
      lastSyncedBlock: syncState?.lastSyncedBlock || 0,
      currentBlock
    });

  } catch (error: any) {
    console.error('[ContributionHistory] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch contribution history',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch events with pagination to handle large block ranges
 * Uses industry best practice: chunk large ranges into smaller queries
 */
async function fetchEventsWithPagination(
  contract: ethers.Contract,
  groupId: number,
  fromBlock: number,
  toBlock: number,
  provider: ethers.JsonRpcProvider
): Promise<any[]> {
  const allEvents: any[] = [];
  const filter = contract.filters.ContributionMade(groupId);

  // Paginate through blocks in chunks
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, toBlock);

    try {
      const events = await contract.queryFilter(filter, start, end);

      // Get timestamps for each event
      const eventsWithTimestamp = await Promise.all(
        events.map(async (event: any) => {
          try {
            const block = await provider.getBlock(event.blockNumber);
            return {
              ...event,
              timestamp: block ? new Date(block.timestamp * 1000) : new Date()
            };
          } catch (err) {
            console.error(`Failed to get block ${event.blockNumber}:`, err);
            return {
              ...event,
              timestamp: new Date()
            };
          }
        })
      );

      allEvents.push(...eventsWithTimestamp);

      // Small delay to avoid rate limiting
      if (end < toBlock) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      console.error(`[Pagination] Error fetching blocks ${start}-${end}:`, error.message);
      // Continue with next chunk even if this one fails
      continue;
    }
  }

  return allEvents;
}

/**
 * Store events in MongoDB with duplicate prevention
 */
async function storeEvents(events: any[], groupId: number): Promise<void> {
  const bulkOps = events.map((event: any) => {
    const args = event.args || event.returnValues;

    return {
      updateOne: {
        filter: {
          transactionHash: event.transactionHash,
          logIndex: event.logIndex || event.transactionLogIndex
        },
        update: {
          $setOnInsert: {
            groupId,
            contributionRound: args?.round?.toString() || '0',
            member: args?.member || args?.contributor || '',
            memberName: '', // Will be populated by frontend if needed
            amount: args?.amount?.toString() || '0',
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            blockHash: event.blockHash,
            logIndex: event.logIndex || event.transactionLogIndex || 0,
            timestamp: event.timestamp || new Date(),
            eventData: {
              args,
              event: event.event,
              signature: event.eventSignature
            }
          }
        },
        upsert: true
      }
    };
  });

  if (bulkOps.length > 0) {
    try {
      // @ts-ignore - Mongoose type conflict in Next.js API route
      const result = await ContributionEvent.bulkWrite(bulkOps, { ordered: false });
    } catch (error: any) {
      // Ignore duplicate key errors (11000)
      if (error.code !== 11000) {
        console.error('[MongoDB] Bulk write error:', error);
        throw error;
      }
    }
  }
}

/**
 * Format events for frontend consumption with proper decimal formatting
 */
function formatContributions(events: any[], tokenDecimals: number, tokenSymbol: string): any[] {
  return events.map((event: any) => {
    // Format amount with proper decimals
    let formattedAmount = event.amount;
    try {
      // If amount is a string BigNumber/hex/bignumber, format it
      // We check if it's a valid number-like value first
      if (event.amount && (typeof event.amount === 'string' || typeof event.amount === 'bigint' || typeof event.amount === 'number')) {
        formattedAmount = ethers.formatUnits(event.amount, tokenDecimals);
      }
    } catch (formatError) {
      console.warn('[FormatContributions] Error formatting amount:', formatError);
    }

    return {
      date: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp,
      member: event.member,
      memberName: event.memberName || `Member ${event.member.slice(0, 6)}...`,
      amount: formattedAmount,
      tokenSymbol,
      transactionHash: event.transactionHash,
      round: event.contributionRound,
      blockNumber: event.blockNumber
    };
  });
}
