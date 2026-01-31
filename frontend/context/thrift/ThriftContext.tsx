"use client";
import React, { createContext, useState, useCallback, useContext, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { contractAddress, MiniSafeAave } from '@/utils/abi';
import { getTokenByAddress, TOKENS } from '@/utils/tokens';
import { BrowserProvider, formatUnits, parseUnits, Contract, JsonRpcProvider } from "ethers";
import { parseAbi } from 'viem';
import { useActiveAccount, useSendTransaction } from 'thirdweb/react';
import { getContract, prepareContractCall, waitForReceipt } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { celo } from "thirdweb/chains";
import useGasSponsorship from '@/hooks/useGasSponsorship';

// Define the type for thrift group data (updated to match contract structure)
export interface ThriftGroup {
  id: number;
  name: string;
  description: string;
  depositAmount: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  maxMembers: number;
  isPublic: boolean;
  isActive: boolean;
  currentRound: number;
  totalMembers: number;
  members: string[];
  contributions: { [address: string]: string };
  payoutOrder: string[];
  completedPayouts: number;
  isUserMember?: boolean;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  userContribution?: string;
  userLastPayment?: Date;
  userNextPayment?: Date;
  pastRecipient?: string;
  meta?: {
    createdBy?: string;
    coverImageUrl?: string;
    category?: string;
    tags?: string[];
  };
}

export interface ThriftMember {
  address: string;
  userName?: string;
  contributionAmount: string;
  joinDate: string;
  hasContributed: boolean;
  payoutPosition?: number;
}

export interface ThriftContextType {
  userGroups: ThriftGroup[];
  allGroups: ThriftGroup[];
  createThriftGroup: (name: string, description: string, depositAmount: string, maxMembers: number, isPublic: boolean, tokenAddress?: string, startDate?: Date, creatorName?: string, email?: string, phone?: string) => Promise<void>;
  joinThriftGroup: (groupId: number, userName?: string, email?: string, phone?: string) => Promise<void>;
  checkJoinStatus: (groupId: number) => Promise<{
    isMember: boolean;
    groupInfo: any;
    canJoin: boolean;
    reason?: string;
  }>;
  checkGroupStatus: (groupId: number) => Promise<{
    exists: boolean;
    isActive: boolean;
    isStarted: boolean;
    canContribute: boolean;
    reason?: string;
    startDate: Date | null;
    timeUntilStart: number | null;
  }>;
  addMemberToPrivateGroup: (groupId: number, memberAddress: string, email?: string, phone?: string, userName?: string) => Promise<void>;
  makeContribution: (groupId: number) => Promise<void>;
  distributePayout: (groupId: number) => Promise<void>;
  getThriftGroupMembers: (groupId: number) => Promise<ThriftMember[]>;
  getContributionHistory: (groupId: number) => Promise<Array<{
    date: Date;
    member: string;
    memberName: string;
    amount: string;
    tokenSymbol: string;
    transactionHash: string;
  }>>;
  generateShareLink: (groupId: number) => string;
  // Admin functions
  activateThriftGroup: (groupId: number) => Promise<void>;
  setPayoutOrder: (groupId: number, payoutOrder: string[]) => Promise<void>;
  emergencyWithdraw: (groupId: number) => Promise<void>;
  getThriftGroupDetails: (groupId: number) => Promise<ThriftGroup | null>;
  // Debug functions
  testBlockchainTimestamp: (groupId: number) => Promise<void>;
  loading: boolean;
  error: string | null;
  refreshGroups: () => Promise<void>;
  initialize: () => Promise<void>;
  // Connection state
  isConnected: boolean;
  account: string | null;
  contract: any; // TODO: Properly type the contract
}

// Celo token addresses
const CELO_TOKEN_ADDRESS = TOKENS.CELO.address;
const CUSD_TOKEN_ADDRESS = TOKENS.CUSD.address;

const ThriftContext = createContext<ThriftContextType | undefined>(undefined);

export const ThriftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userGroups, setUserGroups] = useState<ThriftGroup[]>([]);
  const [allGroups, setAllGroups] = useState<ThriftGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const activeAccount = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [contract, setContract] = useState<MiniSafeAave | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const { checkAndSponsor } = useGasSponsorship();

  // Thirdweb Contract Instance
  const thirdwebContract = getContract({
    client,
    chain: celo,
    address: contractAddress as string,
  });

  // Prevent multiple simultaneous refreshes
  const isRefreshingRef = useRef(false);

  // Custom RPC provider for event querying (fallback when wallet RPC is down)
  const customRpcProvider = new JsonRpcProvider('https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8');

  // Read-only contract instance
  const [readOnlyContract, setReadOnlyContract] = useState<MiniSafeAave | null>(null);

  // Initialize read-only contract immediately
  useEffect(() => {
    const c = new MiniSafeAave(contractAddress, customRpcProvider);
    setReadOnlyContract(c);
  }, []);

  // React to Thirdweb Account Changes
  useEffect(() => {
    if (activeAccount) {
      console.log('[ThriftContext] Active account detected:', activeAccount.address);
      setAccount(activeAccount.address);
      setIsConnected(true);
      // We will instantiate the write-contract when needed or here if we want a global one
      // For now, let's keep the contract state for compatibility but it should use the signer from activeAccount eventually
      // or we use SDK hooks for writes. 
      // For reads, we use customRpcProvider.
    } else {
      console.log('[ThriftContext] No active account');
      setAccount(null);
      setIsConnected(false);
    }
  }, [activeAccount]);

  // Initialize provider - Read Only
  const initialize = useCallback(async () => {
    console.log('[initialize] Setting up READ-ONLY provider');
    // We always have a read provider (customRpcProvider)
    // We don't need to do anything complex here anymore
  }, []);

  // Call initialize function when the component mounts
  useEffect(() => {
    initialize();
    // No window.ethereum listeners here!
    // Thirdweb handles connection state via useActiveAccount
  }, [initialize]);

  // Create thrift group contract interaction
  const createThriftGroup = async (name: string, description: string, depositAmount: string, maxMembers: number, isPublic: boolean, tokenAddress?: string, startDate?: Date, creatorName?: string, email?: string, phone?: string) => {
    // START PHASE 3 FIX: Use activeAccount check instead of contract check
    if (!activeAccount) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);
      setError(null);

      const startTimestamp = startDate ? Math.floor(startDate.getTime() / 1000) : Math.floor(Date.now() / 1000);

      // Use read-only contract for validation checks
      const dataContract = readOnlyContract || contract;
      if (!dataContract) throw new Error("Contract data not available");

      // Use provided token address or determine a supported token
      let finalTokenAddress = tokenAddress;

      if (!finalTokenAddress) {
        const supportedTokens: string[] = await dataContract.getSupportedTokens();
        if (!supportedTokens || supportedTokens.length === 0) {
          const msg = 'No supported tokens configured on the contract. Please contact the admin to add supported tokens.';
          setError(msg);
          toast.error('Unsupported token', { description: msg });
          setTimeout(() => setError(null), 3000);
          return;
        }

        // Preferred token: env override -> cUSD -> first supported
        const preferredEnv = (process.env.NEXT_PUBLIC_THRIFT_TOKEN_ADDRESS || '').toLowerCase();
        finalTokenAddress = (supportedTokens.find(a => a.toLowerCase() === preferredEnv)
          || supportedTokens.find(a => a.toLowerCase() === CUSD_TOKEN_ADDRESS.toLowerCase())
          || supportedTokens[0]) as string;
      }

      // Validate chosen token
      const valid = await dataContract.isValidToken(finalTokenAddress);
      if (!valid) {
        const msg = `Chosen token ${finalTokenAddress} is not supported by the contract.`;
        setError(msg);
        toast.error('Unsupported token', { description: msg });
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Get token decimals from our token configuration
      const tokenConfig = getTokenByAddress(finalTokenAddress);
      const decimals = tokenConfig?.decimals || 18; // Default to 18 if not found
      const amount = parseUnits(depositAmount, decimals);

      // Enforce minimum contribution
      let minContribution: any = undefined;
      try {
        // MIN_CONTRIBUTION is a view constant in ABI
        minContribution = await (dataContract as any).contract.MIN_CONTRIBUTION();
      } catch (_) {
        // If not accessible, proceed without check
      }

      if (minContribution !== undefined && isPublic) {
        if (amount < minContribution) {
          const msg = `Deposit amount is below the minimum contribution: ${formatUnits(minContribution, 18)}.`;
          setError(msg);
          toast.error('Amount too low', { description: msg });
          setTimeout(() => setError(null), 3000);
          return;
        }
      }

      // Sponsor gas for createThriftGroup
      try {
        const sponsorshipResult = await checkAndSponsor(activeAccount.address as `0x${string}`, {
          contractAddress: contractAddress as `0x${string}`,
          abi: parseAbi(["function createThriftGroup(uint256, uint256, bool, address) returns (uint256)"]),
          functionName: 'createThriftGroup',
          args: [amount, BigInt(startTimestamp), isPublic, finalTokenAddress],
        });

        if (sponsorshipResult.gasSponsored) {
          toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (gasError) {
        console.error("Gas sponsorship failed:", gasError);
      }

      console.log('Preparing transaction for createThriftGroup...');
      // Use 4 arguments signature which matched previous usage
      const transaction4Args = prepareContractCall({
        contract: thirdwebContract,
        method: "function createThriftGroup(uint256 amount, uint256 startTime, bool isPublic, address tokenAddress)",
        params: [amount, BigInt(startTimestamp), isPublic, finalTokenAddress]
      });

      console.log('Sending transaction...');
      const tx = await sendTransaction(transaction4Args);
      console.log('Transaction sent:', tx.transactionHash);

      console.log('Waiting for receipt...');
      const receipt = await waitForReceipt({
        client,
        chain: celo,
        transactionHash: tx.transactionHash
      });
      console.log('Receipt received:', receipt.transactionHash);

      // Try to parse the emitted event to get the new groupId
      let newGroupId: number | null = null;
      try {
        if (dataContract) {
          const iface = (dataContract as any).contract.interface;
          for (const log of receipt.logs) {
            try {
              // Cast log to any because Thirdweb receipt type definition might miss topics or use different naming
              const anyLog = log as any;
              // Ensure topics is an array
              const topics = anyLog.topics ? [...anyLog.topics] : [];
              const parsed = iface.parseLog({ topics, data: log.data });
              if (parsed?.name === 'ThriftGroupCreated') {
                newGroupId = Number(parsed.args[0]);
                break;
              }
            } catch (e) { }
          }
        }
      } catch (e) {
        console.warn('Unable to parse ThriftGroupCreated event:', e);
      }

      // Fallback: use totalThriftGroups as the latest id if event parsing failed
      if (!newGroupId) {
        try {
          const total = await dataContract.totalThriftGroups();
          // Total is incremented after creation, so the new ID is total - 1
          const totalNum = Number(total);
          newGroupId = totalNum > 0 ? totalNum - 1 : 0;
        } catch (_) {
          // ignore
        }
      }

      // Persist off-chain metadata (best-effort) with signature auth
      try {
        if (newGroupId !== null && newGroupId !== undefined && activeAccount) {
          const ts = Date.now();
          const msg = [
            'Esusu: Thrift Metadata Update',
            `contractAddress=${contractAddress.toLowerCase()}`,
            `groupId=${newGroupId}`,
            `name=${name}`,
            `description=${description || ''}`,
            `coverImageUrl=`,
            `category=`,
            `tags=`,
            `timestamp=${ts}`,
          ].join('\n');

          // Use Thirdweb account for signing
          const signature = await activeAccount.signMessage({ message: msg });

          await fetch('/api/thrift/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractAddress,
              groupId: newGroupId,
              name,
              description,
              signerAddress: activeAccount.address,
              signature,
              timestamp: ts,
            }),
          });
        }
      } catch (metaErr) {
        console.warn('Failed to save thrift metadata:', metaErr);
      }

      // Store creator as first member in the database with their name
      if (newGroupId !== null && newGroupId !== undefined && activeAccount) {
        try {
          const finalCreatorName = creatorName || 'Creator';
          const creatorData = {
            userAddress: activeAccount.address,
            role: 'creator',
            joinDate: new Date().toISOString(),
            userName: finalCreatorName,
            email,
            phone,
            contractAddress: contractAddress
          };

          const creatorResponse = await fetch(`/api/groups/${newGroupId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creatorData),
          });

          if (creatorResponse.ok) {
            console.log('✅ Creator stored in database successfully');
          }
        } catch (creatorDbError) {
          console.error('❌ Exception while storing creator:', creatorDbError);
        }
      }

      // Wait a moment for the transaction to be mined before refreshing
      setTimeout(async () => {
        try {
          await refreshGroups();
        } catch (refreshError) {
          console.warn('Failed to refresh groups after creation:', refreshError);
        }
      }, 2000);

      toast.success("Thrift group created successfully!");
    } catch (err) {
      console.error("Failed to create thrift group:", err);
      // Parse error message for user-friendly display
      let userMessage = 'Failed to create thrift group';
      if (err instanceof Error) {
        const errorMsg = err.message.toLowerCase();
        if (errorMsg.includes('user rejected') || errorMsg.includes('user denied')) {
          userMessage = 'Transaction was cancelled.';
        } else if (errorMsg.includes('insufficient funds')) {
          userMessage = 'Insufficient funds to complete the transaction.';
        } else if (errorMsg.includes('amount too low') || errorMsg.includes('minimum contribution')) {
          userMessage = err.message;
        } else if (errorMsg.includes('unsupported token')) {
          userMessage = err.message;
        } else {
          userMessage = err.message;
        }
      } else {
        userMessage = String(err);
      }
      setError(userMessage);
      toast.error(userMessage);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Check join status for a group
  const checkJoinStatus = async (groupId: number) => {
    // Use readOnlyContract for public data
    const c = readOnlyContract || contract;
    if (!c) {
      return { isMember: false, groupInfo: null, canJoin: false, reason: 'System initializing...' };
    }

    try {
      const groupInfo = await c.getThriftGroup(groupId);
      // ABI Index 1 is contributionAmount
      const contribAmount = (groupInfo.contributionAmount ?? groupInfo[1] ?? 0).toString();

      if (!groupInfo || contribAmount === '0') {
        return { isMember: false, groupInfo: null, canJoin: false, reason: 'Group not found' };
      }

      // Membership check requires account
      let isMember = false;
      if (account) {
        isMember = await c.isGroupMember(groupId, account);
      }

      let canJoin = false;
      let reason = '';

      // ABI Index 11 is isPublic
      const isPublic = Boolean(groupInfo.isPublic ?? groupInfo[11]);
      // ABI Index 5 is maxMembers
      const maxMembers = Number(groupInfo.maxMembers ?? groupInfo[5] ?? 0);
      const totalMembers = Number(groupInfo.totalMembers ?? 0); // Need to check if totalMembers is in struct or tracked separately
      // Actually totalMembers is usually not in the struct in this contract version, we get it from getGroupMembers length usually
      // But let's assume getThriftGroup might have it or we fetch members. 
      // For checkJoinStatus we might need getGroupMembers count.

      // Let's use getGroupMembers to be safe for count
      const members = await c.getGroupMembers(groupId);
      const memberCount = members.length;

      // ABI Index 10 is isActive
      const isActive = Boolean(groupInfo.isActive ?? groupInfo[10]);

      if (isMember) {
        reason = 'You are already a member of this group';
      } else if (!isPublic) {
        reason = 'This is a private group. You need an invitation to join.';
      } else if (memberCount >= maxMembers) {
        reason = 'Group is full';
      } else if (!isActive && memberCount < maxMembers) {
        // Inactive groups CAN be joined until they are full/activated? 
        // Usually yes, simple savings.
        canJoin = true;
        // But if logic says "Group not active yet" blocking join? 
        // Usually we join BEFORE activation. Activation starts the timer.
        // So !isActive is fine for joining.
      } else {
        canJoin = true;
      }

      return {
        isMember,
        groupInfo: {
          exists: true,
          isPublic,
          totalMembers: memberCount,
          maxMembers,
          isActive,
          contributionAmount: contribAmount
        },
        canJoin,
        reason
      };
    } catch (error) {
      console.error('Failed to check join status:', error);
      return {
        isMember: false,
        groupInfo: null,
        canJoin: false,
        reason: 'Failed to check group status'
      };
    }
  };

  // Join public thrift group contract interaction
  const joinThriftGroup = async (groupId: number, userName?: string, email?: string, phone?: string) => {
    if (!activeAccount) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🎯 joinThriftGroup called with:', {
        groupId,
        userName,
        hasUserName: !!userName,
        userNameLength: userName?.length
      });

      // Check if group exists and is joinable before attempting to join
      const status = await checkJoinStatus(groupId);
      if (!status.canJoin) {
        throw new Error(status.reason || 'Cannot join this group');
      }

      console.log('Attempting to join group:', groupId);

      // Check for collateral requirement if group is public
      if (status.groupInfo?.isPublic) {
        const contributionAmount = BigInt(status.groupInfo.contributionAmount);
        const collateralAmount = contributionAmount * 5n; // 5x collateral

        if (collateralAmount > 0n) {
          // We need to get the token address. 
          // Use readOnlyContract to fetch full group info if needed
          const c = readOnlyContract || contract;
          let tokenAddress = '';
          if (c) {
            const fullGroup = await c.getThriftGroup(groupId);
            tokenAddress = fullGroup.tokenAddress || fullGroup[6]; // Index 6 or name
            // Wait, previous index analysis says 6 might be something else?
            // createThriftGroup view showed tokenAddress at index 9? 
            // Line 1511 in ThriftContext (viewed earlier): `tokenAddress = tg.tokenAddress ?? tg[9] ?? '';`
            // I should trust the property name first.
            // If not available, we assume property access works on the proxy/struct.
          }

          if (tokenAddress) {
            // Thirdweb contract for ERC20
            const tokenContract = getContract({
              client,
              chain: celo,
              address: tokenAddress,
            });

            // Check balance and allowance using extensions or raw calls
            // We can use simple read functionality
            const erc20Abi = [
              "function allowance(address owner, address spender) view returns (uint256)",
              "function balanceOf(address owner) view returns (uint256)",
              "function approve(address spender, uint256 amount) returns (bool)"
            ];
            // Helper for read
            // We can use thirdweb read extension but manual is fine
            // Actually `getContract` infers common standards?
            // Let's use prepareContractCall for approve.
            // But for reading we need a way. `tokenContract` instance has `read` property?
            // No, in v5 SDK we use `readContract`.
            // `import { readContract } from "thirdweb";`
            // I didn't import `readContract`.
            // I should assume I can use `dataContract` if it's generic? No, `dataContract` is Thrift contract.
            // I'll use the Ethers provider for reading since I have it?
            // Or better, just import `readContract` in a future step?
            // I cannot add imports easily inside `replace_file_content`.
            // I will use `provider` (Ethers) for reading ERC20 state, assuming provider exists?
            // `provider` might be null if using Social Login without Ethers adapter?
            // Wait, `ThirdwebProvider` usually exposes a provider or we can use `jsonRpcProvider` fallback (customRpcProvider).
            // `customRpcProvider` (lines 117) is available!
            const readProvider = provider || customRpcProvider;
            const erc20Read = new Contract(tokenAddress, erc20Abi, readProvider);

            const currentAllowance = await erc20Read.allowance(activeAccount.address, contractAddress);
            const userBalance = await erc20Read.balanceOf(activeAccount.address);

            if (userBalance < collateralAmount) {
              const requiredFormatted = formatUnits(collateralAmount, 18); // Assuming 18
              throw new Error(`Insufficient balance for collateral. You need ${requiredFormatted} tokens.`);
            }

            if (currentAllowance < collateralAmount) {
              toast.info("Approval Required for Collateral", {
                description: "Public groups require locking 5x contribution as collateral. Please approve."
              });

              // Sponsor gas logic
              try {
                const sponsorshipResult = await checkAndSponsor(activeAccount.address as `0x${string}`, {
                  contractAddress: tokenAddress as `0x${string}`,
                  abi: parseAbi(["function approve(address, uint256) returns (bool)"]),
                  functionName: 'approve',
                  args: [contractAddress, collateralAmount],
                });
                if (sponsorshipResult.gasSponsored) {
                  toast.success(`Gas sponsored for approval`);
                  await new Promise(resolve => setTimeout(resolve, 3000));
                }
              } catch (_) { }

              console.log('Sending approval tx via Thirdweb...');
              const approvalTx = prepareContractCall({
                contract: tokenContract,
                method: "function approve(address spender, uint256 amount) returns (bool)",
                params: [contractAddress as string, collateralAmount]
              });
              const txInfo = await sendTransaction(approvalTx);
              await waitForReceipt({ client, chain: celo, transactionHash: txInfo.transactionHash });
              toast.success("Collateral Approved");
            }
          }
        }
      }

      // Sponsor gas for joinPublicGroup
      try {
        const sponsorshipResult = await checkAndSponsor(activeAccount.address as `0x${string}`, {
          contractAddress: contractAddress as `0x${string}`,
          abi: parseAbi(["function joinPublicGroup(uint256)"]),
          functionName: 'joinPublicGroup',
          args: [BigInt(groupId)],
        });

        if (sponsorshipResult.gasSponsored) {
          toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (gasError) {
        console.error("Gas sponsorship failed:", gasError);
      }

      const joinTx = prepareContractCall({
        contract: thirdwebContract,
        method: "function joinPublicGroup(uint256 groupId)", // Name/Desc handled separately? 
        // Wait, ABI earlier showed `joinPublicGroup(uint256, string, string)` in sponsor check?
        // Line 586: `abi: parseAbi(["function joinPublicGroup(uint256, string, string)"]),`
        // But the args in sponsor check (line 588) were `[BigInt(groupId)]`. 1 arg!
        // This implies `joinPublicGroup` takes 1 arg?
        // Line 599: `await contract.joinPublicGroup(groupId);`.
        // So it takes 1 arg. The ABI in sponsor check probably has extra args ignored or optional?
        // Or overload?
        // I'll use 1 arg `joinPublicGroup(uint256)`.
        params: [BigInt(groupId)]
      });

      const txInfo = await sendTransaction(joinTx);
      console.log('Join transaction sent:', txInfo.transactionHash);

      const receipt = await waitForReceipt({
        client,
        chain: celo,
        transactionHash: txInfo.transactionHash
      });
      console.log('Join transaction confirmed');

      // Get the actual join date from the blockchain transaction
      let actualJoinDate = new Date();
      // Logic to get block timestamp from receipt (need provider)
      // We can use customRpcProvider if provider is missing
      try {
        const readProvider = provider || customRpcProvider;
        if (receipt.blockNumber) {
          const block = await readProvider.getBlock(receipt.blockNumber);
          if (block && block.timestamp) {
            actualJoinDate = new Date(block.timestamp * 1000);
          }
        }
      } catch (e) { console.warn('Failed to get block time', e); }

      const currentContractAddress = contractAddress;

      // Store join date in database with the actual blockchain timestamp
      try {
        const finalUserName = userName || `Member ${Date.now()}`;
        const memberData = {
          userAddress: activeAccount.address,
          role: 'member',
          joinDate: actualJoinDate.toISOString(),
          userName: finalUserName,
          email,
          phone,
          contractAddress: currentContractAddress
        };

        const response = await fetch(`/api/groups/${groupId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(memberData),
        });

        if (!response.ok) {
          // log error
          const errorData = await response.json();
          console.error('Database storage failed:', errorData);
          toast.warning("Partially successful", { description: "Joined on-chain but DB update failed." });
        } else {
          console.log('✅ Join date stored in database successfully');
        }
      } catch (dbError) {
        console.error('Database storage failed:', dbError);
        toast.warning("Partially successful", { description: "Joined on-chain but DB update failed." });
      }

      await refreshGroups();
      toast.success("Successfully joined the thrift group!");
    } catch (err) {
      console.error("Failed to join thrift group:", err);
      let userMessage = 'Failed to join thrift group';
      if (err instanceof Error) {
        const errorMsg = err.message.toLowerCase();
        if (errorMsg.includes('group has already started')) {
          userMessage = 'This group has already started and is no longer accepting new members.';
        } else if (errorMsg.includes('group is full')) {
          userMessage = 'This group is full and cannot accept more members.';
        } else if (errorMsg.includes('not a public group')) {
          userMessage = 'This is a private group. You need an invitation to join.';
        } else if (errorMsg.includes('already a member')) {
          userMessage = 'You are already a member of this group.';
        } else if (errorMsg.includes('user rejected') || errorMsg.includes('user denied')) {
          userMessage = 'Transaction was cancelled.';
        } else if (errorMsg.includes('insufficient funds')) {
          userMessage = 'Insufficient funds to complete the transaction.';
        } else {
          userMessage = err.message;
        }
      } else {
        userMessage = String(err);
      }
      setError(userMessage);
      toast.error(userMessage);
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Check group status (active, started, can contribute)
  const checkGroupStatus = async (groupId: number) => {
    const c = readOnlyContract || contract;
    if (!c) {
      return {
        exists: false,
        isActive: false,
        isStarted: false,
        canContribute: false,
        reason: 'Contract not initialized',
        startDate: null,
        timeUntilStart: null
      };
    }

    try {
      // Get group info from contract
      const groupInfo = await c.getGroupInfo(groupId);
      if (!groupInfo || groupInfo.contributionAmount === 0) {
        return {
          exists: false,
          isActive: false,
          isStarted: false,
          canContribute: false,
          reason: 'Group not found',
          startDate: null,
          timeUntilStart: null
        };
      }

      // Get thrift group details
      const thriftGroup = await c.getThriftGroup(groupId);

      // Both groupInfo and thriftGroup have isActive fields
      // Based on the ABI, groupInfo.isActive should be the main indicator
      // ABI Index 10 is isActive
      const isActive = Boolean(groupInfo.isActive ?? groupInfo[10]);

      // For "started" state, we need to check if the group has actually begun
      // This could be based on startDate, currentRound, or other indicators
      // ABI Index 2 is startDate
      const startDate = Number(thriftGroup.startDate ?? thriftGroup[2] ?? 0);
      const currentTime = Math.floor(Date.now() / 1000);
      const isStarted = isActive && startDate > 0 && currentTime >= startDate;

      const canContribute = isActive && isStarted;

      // Calculate time until start
      let timeUntilStart = null;
      if (startDate > 0 && currentTime < startDate) {
        timeUntilStart = startDate - currentTime; // seconds until start
      }

      let reason = '';
      if (!isActive) {
        reason = 'Group is not active. Admin needs to activate the group.';
      } else if (!isStarted) {
        reason = 'Group has not started yet. The start date has not been reached.';
      } else if (!canContribute) {
        reason = 'Group is not ready for contributions.';
      }

      console.log('Group status check:', {
        groupId,
        isActive,
        isStarted,
        canContribute,
        startDate,
        currentTime,
        timeUntilStart,
        groupInfoIsActive: groupInfo.isActive,
        thriftGroupIsActive: thriftGroup.isActive
      });

      return {
        exists: true,
        isActive,
        isStarted,
        canContribute,
        reason: reason || undefined,
        startDate: startDate > 0 ? new Date(startDate * 1000) : null,
        timeUntilStart
      };
    } catch (error) {
      console.error('Failed to check group status:', error);
      return {
        exists: false,
        isActive: false,
        isStarted: false,
        canContribute: false,
        reason: `Failed to check group status: ${error instanceof Error ? error.message : String(error)}`,
        startDate: null,
        timeUntilStart: null
      };
    }
  };

  // Add member to private group contract interaction
  const addMemberToPrivateGroup = async (groupId: number, memberAddress: string, email?: string, phone?: string, userName?: string) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);

      // Sponsor gas for addMemberToPrivateGroup
      try {
        const sponsorshipResult = await checkAndSponsor(account as `0x${string}`, {
          contractAddress: contractAddress as `0x${string}`,
          abi: parseAbi(["function addMemberToPrivateGroup(uint256, address)"]),
          functionName: 'addMemberToPrivateGroup',
          args: [BigInt(groupId), memberAddress],
        });

        if (sponsorshipResult.gasSponsored) {
          toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (gasError) {
        console.error("Gas sponsorship failed:", gasError);
      }

      const tx = await contract.addMemberToPrivateGroup(groupId, memberAddress);
      await tx.wait();

      // Save member name to database if provided
      if (userName) {
        try {
          await fetch(`/api/groups/${groupId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userAddress: memberAddress,
              userName: userName,
              role: 'member',
              joinDate: new Date().toISOString(),
              contractAddress: contractAddress
            })
          });
        } catch (apiError) {
          console.warn('Failed to save member name to database:', apiError);
          // Don't fail the operation if just the name save fails
        }
      }

      await refreshGroups();
      toast.success("Member added successfully!");
    } catch (err) {
      console.error("Failed to add member:", err);
      const errorMsg = `Failed to add member: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMsg);
      toast.error(errorMsg);

      // Auto-clear error after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  // Make contribution contract interaction
  const makeContribution = async (groupId: number) => {
    console.log('makeContribution called with groupId:', groupId);

    if (!activeAccount) {
      console.log('makeContribution: Wallet not connected');
      throw new Error("Wallet not connected");
    }

    try {
      console.log('makeContribution: Setting loading to true');
      setLoading(true);
      setError(null);

      const c = readOnlyContract || contract;
      if (!c) {
        throw new Error("Contract data not available");
      }

      // Check group status before attempting contribution
      try {
        const groupStatus = await checkGroupStatus(groupId);
        console.log('Group status:', groupStatus);

        if (!groupStatus.exists) {
          throw new Error("Group not found");
        }

        if (!groupStatus.canContribute) {
          throw new Error(groupStatus.reason || "Group is not ready for contributions");
        }
      } catch (statusError) {
        console.error('Group status check failed:', statusError);
        throw statusError;
      }

      // Check if user is a member of the group
      try {
        const isMember = await c.isGroupMember(groupId, activeAccount.address);
        console.log('User is member of group:', isMember);
        if (!isMember) {
          throw new Error("You are not a member of this group. Please join the group before contributing.");
        }
      } catch (memberCheckError) {
        console.error('Failed to check membership:', memberCheckError);
        // Don't throw here, let the contract call handle it? No, better to fail early if we know.
      }

      // Get detailed group status logic
      // We need token address and amount
      const groupInfo = await c.getGroupInfo(groupId);
      const thriftGroup = await c.getThriftGroup(groupId);

      const tokenAddress = thriftGroup.tokenAddress || thriftGroup[6];
      // ABI Index 1 is contributionAmount
      const contributionAmount = BigInt(groupInfo.contributionAmount ?? groupInfo[1] ?? 0);

      console.log('makeContribution: Token approval check:', {
        tokenAddress,
        contributionAmount: contributionAmount.toString(),
        contractAddress: contractAddress
      });

      // Check and handle token approval
      if (tokenAddress && contributionAmount > 0n) {
        try {
          const erc20Abi = [
            "function approve(address spender, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)"
          ];
          const readProvider = provider || customRpcProvider;
          const erc20ReadOnly = new Contract(tokenAddress, erc20Abi, readProvider);

          // Decimals
          let tokenDecimals = 18;
          try { tokenDecimals = Number(await erc20ReadOnly.decimals()); } catch (_) { }

          // Allowance
          const currentAllowance = await erc20ReadOnly.allowance(activeAccount.address, contractAddress);
          console.log('Current allowance:', currentAllowance.toString());

          // Balance
          const userBalance = await erc20ReadOnly.balanceOf(activeAccount.address);
          console.log('User balance:', userBalance.toString());

          if (userBalance < contributionAmount) {
            const userFormatted = formatUnits(userBalance, tokenDecimals);
            const reqFormatted = formatUnits(contributionAmount, tokenDecimals);
            toast.error("Insufficient Token Balance", {
              description: `You have ${userFormatted} tokens but need ${reqFormatted}.`
            });
            throw new Error(`Insufficient funds. You have ${userFormatted} but need ${reqFormatted}.`);
          }

          if (currentAllowance < contributionAmount) {
            console.log('Insufficient allowance, requesting approval...');
            toast.info("Approval Required", { description: "Please approve tokens for contribution." });

            // Sponsor gas logic
            try {
              const sponsorshipResult = await checkAndSponsor(activeAccount.address as `0x${string}`, {
                contractAddress: tokenAddress as `0x${string}`,
                abi: parseAbi(["function approve(address, uint256) returns (bool)"]),
                functionName: 'approve',
                args: [contractAddress, contributionAmount],
              });
              if (sponsorshipResult.gasSponsored) {
                toast.success(`Gas sponsored for approval`);
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            } catch (_) { }

            const tokenContract = getContract({ client, chain: celo, address: tokenAddress });
            const approvalTx = prepareContractCall({
              contract: tokenContract,
              method: "function approve(address spender, uint256 amount) returns (bool)",
              params: [contractAddress as string, contributionAmount]
            });

            const txInfo = await sendTransaction(approvalTx);
            await waitForReceipt({ client, chain: celo, transactionHash: txInfo.transactionHash });
            toast.success("Approval Confirmed");
          }
        } catch (approvalError) {
          console.error('Token approval failed:', approvalError);
          throw new Error(`Token approval failed: ${approvalError instanceof Error ? approvalError.message : String(approvalError)}`);
        }
      }

      console.log('makeContribution: Calling contract.makeContribution...');

      // Sponsor gas for makeContribution
      try {
        const sponsorshipResult = await checkAndSponsor(activeAccount.address as `0x${string}`, {
          contractAddress: contractAddress as `0x${string}`,
          abi: parseAbi(["function makeContribution(uint256)"]),
          functionName: 'makeContribution',
          args: [BigInt(groupId)],
        });

        if (sponsorshipResult.gasSponsored) {
          toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (gasError) {
        console.error("Gas sponsorship failed:", gasError);
      }

      const tx = prepareContractCall({
        contract: thirdwebContract,
        method: "function makeContribution(uint256 groupId)",
        params: [BigInt(groupId)]
      });

      const txInfo = await sendTransaction(tx);
      console.log('makeContribution: Transaction sent:', txInfo.transactionHash);

      console.log('makeContribution: Waiting for transaction confirmation...');
      await waitForReceipt({ client, chain: celo, transactionHash: txInfo.transactionHash });
      console.log('makeContribution: Transaction confirmed');

      console.log('makeContribution: Refreshing groups...');
      await refreshGroups();
      console.log('makeContribution: Groups refreshed');
      toast.success("Contribution successful!");

    } catch (err) {
      console.error('makeContribution: Error occurred:', err);

      // Handle specific error cases with better error messages
      if (err instanceof Error) {
        if (err.message.includes("Group has not started yet")) {
          throw new Error("Group has not started yet. Please wait for the admin to activate the group before contributing.");
        } else if (err.message.includes("Group is not active")) {
          throw new Error("Group is not active. Please wait for the admin to activate the group before contributing.");
        } else if (err.message.includes("You are not a member")) {
          throw new Error("You are not a member of this group. Please join the group before contributing.");
        } else if (err.message.includes("transfer value exceeded sender's allowance")) {
          throw new Error("Token approval required. Please approve the contract to spend your tokens first.");
        } else if (err.message.includes("Token approval")) {
          throw err;
        } else if (err.message.includes("execution reverted")) {
          throw new Error("Unable to contribute at this time. Please check that the group is active and you are a member.");
        } else if (err.message.includes("insufficient funds")) {
          throw new Error("Insufficient funds. Please ensure you have enough tokens to make the contribution.");
        } else if (err.message.includes("user rejected")) {
          throw new Error("Transaction was cancelled by user.");
        }
      }

      setError(`Failed to contribute: ${err instanceof Error ? err.message : String(err)}`);
      throw err; // Re-throw so the page component can handle the error
    } finally {
      console.log('makeContribution: Setting loading to false');
      setLoading(false);
    }
  };

  // Function to get thrift group members
  const getThriftGroupMembers = async (groupId: number): Promise<ThriftMember[]> => {
    const c = readOnlyContract || contract;
    if (!c) {
      throw new Error("Contract data not available");
    }

    try {
      // Primary: Fetch members from contract (authoritative blockchain data)
      const blockchainMembers: string[] = await c.getGroupMembers(groupId);
      console.log(`📋 Blockchain members for group ${groupId}:`, blockchainMembers);

      // Fetch join dates from cached blockchain API (ALWAYS - this is the source of truth)
      let dbMemberData: { [address: string]: { joinDate: string; userName: string } } = {};
      let allMemberAddresses: Set<string> = new Set(blockchainMembers.map(a => a.toLowerCase()));

      console.log(`🔍 Fetching join dates from cached blockchain API for group ${groupId}`);
      try {
        const blockchainResponse = await fetch(`/api/thrift/join-dates-cached/${groupId}`);
        if (blockchainResponse.ok) {
          const blockchainData = await blockchainResponse.json();
          console.log('📅 Cached join dates response:', blockchainData);

          if (blockchainData.success && blockchainData.joinDates) {
            // Use blockchain data as the primary source for join dates
            let memberIndex = 1;
            Object.keys(blockchainData.joinDates).forEach(address => {
              dbMemberData[address.toLowerCase()] = {
                joinDate: blockchainData.joinDates[address],
                userName: `Member ${memberIndex}` // Temporary, will be replaced by DB names
              };
              console.log(`📅 Cached join date for ${address}: ${blockchainData.joinDates[address]}`);
              memberIndex++;
            });
          }
        } else {
          console.warn('Cached blockchain API response not ok:', blockchainResponse.status);
        }
      } catch (blockchainError) {
        console.error('Failed to fetch cached join dates from blockchain:', blockchainError);
      }

      // Fetch usernames from database and merge with join dates
      console.log(`🔍 Fetching usernames from database for group ${groupId}`);
      try {
        const dbResponse = await fetch(`/api/groups/${groupId}/members?contract=${contractAddress.toLowerCase()}`);
        if (dbResponse.ok) {
          const dbData = await dbResponse.json();
          console.log('👤 Database members response:', dbData);

          if (dbData.members && Array.isArray(dbData.members)) {
            dbData.members.forEach((member: any) => {
              const addr = (member.address || '').toLowerCase();

              // Add member to our tracking set (includes creators not yet on blockchain)
              allMemberAddresses.add(addr);

              if (addr && dbMemberData[addr]) {
                // Merge userName from database with existing join date from blockchain
                if (member.userName) {
                  dbMemberData[addr].userName = member.userName;
                  console.log(`👤 Updated username for ${addr}: ${member.userName}`);
                } else {
                  console.log(`👤 No username in DB for ${addr}, keeping default`);
                }
              } else if (addr) {
                // Member exists in DB but not in blockchain yet (e.g., creator who hasn't officially joined)
                console.log(`👤 Adding creator/member ${addr} from DB (not yet on blockchain)`);
                dbMemberData[addr] = {
                  joinDate: member.joinedAt || new Date().toISOString(),
                  userName: member.userName || (member.role === 'creator' ? 'Creator' : `Member ${allMemberAddresses.size}`)
                };
              }
            });
          }
        } else {
          console.warn('Database members API response not ok:', dbResponse.status);
        }
      } catch (dbError) {
        console.warn('Failed to fetch usernames from database:', dbError);
      }

      // Convert set back to array for mapping
      const allMembers = Array.from(allMemberAddresses);
      console.log(`📋 Total members (blockchain + database): ${allMembers.length}`);

      return allMembers.map((address: string, index: number) => {
        // Prioritize database data, fallback to defaults
        let joinDate: string;
        let userName: string;

        if (dbMemberData[address.toLowerCase()]) {
          // Use database data (most accurate)
          joinDate = dbMemberData[address.toLowerCase()].joinDate;
          userName = dbMemberData[address.toLowerCase()].userName;
          console.log(`📅 Using database data for ${address}: ${joinDate}, name: ${userName}`);
        } else {
          // Fallback: use current time and generate name
          joinDate = new Date().toISOString();
          userName = `Member ${index + 1}`;
          console.warn(`📅 No data found for member ${address}, using fallback: ${joinDate}, name: ${userName}`);
        }

        return {
          address,
          userName,
          contributionAmount: '0', // Would need to query individual contributions
          joinDate,
          hasContributed: false, // Would need to check contribution status
          payoutPosition: index
        };
      });
    } catch (error) {
      console.error("Failed to fetch group members:", error);
      throw error;
    }
  };

  // Distribute payout contract interaction
  const distributePayout = async (groupId: number) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Distributing payout for groupId:', groupId);

      // Sponsor gas for distributePayout
      try {
        const sponsorshipResult = await checkAndSponsor(account as `0x${string}`, {
          contractAddress: contractAddress as `0x${string}`,
          abi: parseAbi(["function distributePayout(uint256)"]),
          functionName: 'distributePayout',
          args: [BigInt(groupId)],
        });

        if (sponsorshipResult.gasSponsored) {
          toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (gasError) {
        console.error("Gas sponsorship failed:", gasError);
      }

      const tx = await contract.distributePayout(groupId);
      console.log('Payout transaction sent:', tx.hash);
      await tx.wait();
      console.log('Payout transaction confirmed');

      // Add small delay to ensure blockchain state is updated
      await new Promise(resolve => setTimeout(resolve, 2000));

      await refreshGroups();
      toast.success("Payout distributed successfully!");
    } catch (err) {
      console.error("Failed to distribute payout:", err);
      const errorMsg = `Failed to distribute payout: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMsg);
      toast.error(errorMsg);

      // Auto-clear error after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };


  // Generate shareable link for a thrift group
  const generateShareLink = (groupId: number): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/thrift/join/${groupId}`;
  };

  // Admin functions
  const activateThriftGroup = async (groupId: number): Promise<void> => {
    if (!isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);

      // Sponsor gas logic
      await checkAndSponsor(account as `0x${string}`, {
        contractAddress: contractAddress as `0x${string}`,
        abi: parseAbi(["function activateThriftGroup(uint256)"]),
        functionName: 'activateThriftGroup',
        args: [BigInt(groupId)],
      }).catch(console.error);

      const transaction = prepareContractCall({
        contract: thirdwebContract,
        method: "function activateThriftGroup(uint256)",
        params: [BigInt(groupId)]
      });

      const tx = await sendTransaction(transaction);
      await waitForReceipt({
        client,
        chain: celo,
        transactionHash: tx.transactionHash
      });

      await refreshGroups();
    } catch (error) {
      console.error('activateThriftGroup: Error occurred:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const setPayoutOrder = async (groupId: number, payoutOrder: string[]): Promise<void> => {
    if (!isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);

      const transaction = prepareContractCall({
        contract: thirdwebContract,
        method: "function setPayoutOrder(uint256, address[])",
        params: [BigInt(groupId), payoutOrder]
      });

      const tx = await sendTransaction(transaction);
      await waitForReceipt({
        client,
        chain: celo,
        transactionHash: tx.transactionHash
      });

      await refreshGroups();
    } catch (error) {
      console.error("Failed to set payout order:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const emergencyWithdraw = async (groupId: number): Promise<void> => {
    if (!isConnected) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);

      const transaction = prepareContractCall({
        contract: thirdwebContract,
        method: "function emergencyWithdraw(uint256)",
        params: [BigInt(groupId)]
      });

      const tx = await sendTransaction(transaction);
      await waitForReceipt({
        client,
        chain: celo,
        transactionHash: tx.transactionHash
      });

      await refreshGroups();
    } catch (error) {
      console.error("Failed to execute emergency withdrawal:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Helper to fetch a single group's details
  const getThriftGroupDetails = useCallback(async (groupId: number): Promise<ThriftGroup | null> => {
    const dataContract = readOnlyContract || contract;
    if (!dataContract) return null;

    try {
      // Parallel fetch with error handling
      const [tg, members, payoutOrder, isMember, currentRecipient, groupPayouts] = await Promise.all([
        dataContract.getThriftGroup(groupId).catch(() => null),
        dataContract.getGroupMembers(groupId).catch(() => []),
        dataContract.getPayoutOrder(groupId).catch(() => []),
        account ? dataContract.isGroupMember(groupId, account).catch(() => false) : Promise.resolve(false),
        dataContract.getCurrentRecipient(groupId).catch(() => null),
        dataContract.getGroupPayouts(groupId).catch(() => []),
      ]);

      const contributionAmountStr = (tg?.contributionAmount ?? tg?.[1])?.toString?.() ?? '0';
      if (!tg || contributionAmountStr === '0') return null;

      const info = tg;
      let maxMembers = members?.length ?? 0;
      let tokenAddress = '';
      let tokenSymbol = 'cUSD';
      let tokenDecimals = 18;

      try {
        maxMembers = Number((tg.maxMembers ?? tg[5] ?? maxMembers));
        tokenAddress = tg.tokenAddress ?? tg[9] ?? '';

        if (tokenAddress) {
          const tokenConfig = getTokenByAddress(tokenAddress);
          if (tokenConfig) {
            tokenSymbol = tokenConfig.symbol;
            tokenDecimals = tokenConfig.decimals;
          }
        }
      } catch (_) { }

      let userContribution = '0';
      let userLastPayment: Date | undefined;
      let userNextPayment: Date | undefined;
      let lastPaymentDate: Date | undefined;
      let nextPaymentDate: Date | undefined;
      let pastRecipient: string | undefined;

      if (account) {
        try {
          const contributionStatus = await dataContract.checkContributionDue(account, groupId);
          if (contributionStatus && contributionStatus.contributionAmount) {
            userContribution = formatUnits(contributionStatus.contributionAmount, tokenDecimals);
          }

          const currentRound = Number(info.currentRound ?? tg[7] ?? 0);
          const startTime = Number(info.startDate ?? tg[2] ?? 0);
          const isActive = Boolean(info.isActive ?? tg[10]);
          const contributionInterval = 7 * 24 * 60 * 60;

          if (groupPayouts && groupPayouts.length > 0) {
            const latestPayout = groupPayouts[groupPayouts.length - 1];
            pastRecipient = latestPayout.recipient;
          } else if (currentRecipient && currentRecipient !== '0x0000000000000000000000000000000000000000') {
            pastRecipient = currentRecipient;
          }

          if (startTime > 0 && isActive) {
            const startDate = new Date(startTime * 1000);
            const lastPayment = new Date(startDate.getTime() + (currentRound * contributionInterval * 1000));
            const nextPayment = new Date(startDate.getTime() + ((currentRound + 1) * contributionInterval * 1000));
            lastPaymentDate = lastPayment;
            nextPaymentDate = nextPayment;
            userLastPayment = lastPayment;
            userNextPayment = nextPayment;
          } else if (startTime > 0 && !isActive) {
            const startDate = new Date(startTime * 1000);
            nextPaymentDate = startDate;
            userNextPayment = startDate;
          }
        } catch (err) {
          console.warn(`Failed to get payment data for group ${groupId}:`, err);
        }
      }

      // Hydrate metadata for this single group
      let name = `Group ${groupId}`;
      let description = 'Thrift Group';
      let meta: any = undefined;

      try {
        const res = await fetch(`/api/thrift/metadata?contract=${contractAddress}&ids=${groupId}`);
        if (res.ok) {
          const data = await res.json();
          const item = Array.isArray(data?.items) ? data.items[0] : null;
          if (item) {
            name = item.name || name;
            description = item.description || description;
            meta = {
              createdBy: item.createdBy,
              coverImageUrl: item.coverImageUrl,
              category: item.category,
              tags: Array.isArray(item.tags) ? item.tags : [],
            };
          }
        }
      } catch (e) {
        console.warn('Failed to hydrate single group metadata:', e);
      }

      return {
        id: groupId,
        name,
        description,
        depositAmount: formatUnits(info.contributionAmount ?? 0, tokenDecimals),
        tokenSymbol,
        tokenAddress,
        maxMembers,
        isPublic: Boolean(info.isPublic),
        isActive: Boolean(info.isActive),
        currentRound: Number(info.currentRound ?? 0),
        totalMembers: Number(info.memberCount ?? members.length ?? 0),
        members: members ?? [],
        contributions: {},
        payoutOrder: payoutOrder ?? [],
        completedPayouts: Number(info.currentCycle ?? 0),
        isUserMember: Boolean(isMember) || (!!account && members.some((m: string) => m.toLowerCase() === account.toLowerCase())),
        lastPaymentDate,
        nextPaymentDate,
        userContribution,
        userLastPayment,
        userNextPayment,
        pastRecipient,
        meta
      };
    } catch (error) {
      console.error('getThriftGroupDetails error:', error);
      return null;
    }
  }, [readOnlyContract, contract, account]);

  // Function to fetch all thrift groups
  const refreshGroups = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshingRef.current) {
      console.log('[refreshGroups] Already refreshing, skipping...');
      return;
    }

    // Use readOnlyContract if available, fallback to contract
    const dataContract = readOnlyContract || contract;

    console.log('[refreshGroups] Starting refresh with:', {
      hasDataContract: !!dataContract,
      isConnected,
      hasAccount: !!account,
    });

    if (!dataContract) {
      console.log('[refreshGroups] No contract available yet (read-only or write)');
      return;
    }

    // No guard clause for wallet connection! Public data is free.

    isRefreshingRef.current = true;
    try {
      setLoading(true);
      setError(null);

      const fetchedGroups: ThriftGroup[] = [];
      const userGroupsTemp: ThriftGroup[] = [];

      // Determine total groups from contract and iterate 1..total
      const totalGroupsBn = await dataContract.totalThriftGroups();
      const totalGroups = Number(totalGroupsBn);
      if (totalGroups === 0) {
        setAllGroups([]);
        setUserGroups([]);
        return;
      }

      const groupIds = Array.from({ length: totalGroups }, (_, i) => i);

      // Fetch all groups in parallel per group for better UX
      for (const groupId of groupIds) {
        try {
          // Parallel fetch with error handling for non-existent groups
          // Use dataContract (read-only)
          const [tg, members, payoutOrder, isMember, currentRecipient, groupPayouts] = await Promise.all([
            dataContract.getThriftGroup(groupId).catch(() => null),
            dataContract.getGroupMembers(groupId).catch(() => []),
            dataContract.getPayoutOrder(groupId).catch(() => []),
            account ? dataContract.isGroupMember(groupId, account).catch((err: any) => {
              console.warn(`isGroupMember check failed for ${groupId}:`, err);
              return false;
            }) : Promise.resolve(false),
            dataContract.getCurrentRecipient(groupId).catch(() => null),
            dataContract.getGroupPayouts(groupId).catch(() => []),
          ]);

          // Use TG properties (ethers returns named properties mostly)
          // ABI Index 1 is contributionAmount
          const contributionAmountStr = (tg?.contributionAmount ?? tg?.[1])?.toString?.() ?? '0';
          if (!tg || contributionAmountStr === '0') continue;

          // ... rest of logic same as before but using updated variables ...

          // Try to get maxMembers and token info from thriftGroups mapping (re-used tg)
          const info = tg; // Alias info to tg for legacy compatibility in logic below

          // Try to get maxMembers and token info from thriftGroups mapping
          let maxMembers = members?.length ?? 0;
          let tokenAddress = '';
          let tokenSymbol = 'cUSD'; // Default fallback
          let tokenDecimals = 18; // Default fallback

          try {
            // We already have tg
            // Support both object and array returns
            maxMembers = Number((tg.maxMembers ?? tg[5] ?? maxMembers));
            // Get token address from contract data
            tokenAddress = tg.tokenAddress ?? tg[9] ?? '';

            // Get token info from our configuration
            if (tokenAddress) {
              const tokenConfig = getTokenByAddress(tokenAddress);
              if (tokenConfig) {
                tokenSymbol = tokenConfig.symbol;
                tokenDecimals = tokenConfig.decimals;
              }
            }
          } catch (_) {
            // ignore
          }

          // ...

          // Get user payment data from blockchain
          let userContribution = '0';
          let userLastPayment: Date | undefined;
          let userNextPayment: Date | undefined;
          let lastPaymentDate: Date | undefined;
          let nextPaymentDate: Date | undefined;
          let pastRecipient: string | undefined;

          if (account) {
            try {
              // Get user's contribution status - Use dataContract
              const contributionStatus = await dataContract.checkContributionDue(account, groupId);
              if (contributionStatus && contributionStatus.contributionAmount) {
                userContribution = formatUnits(contributionStatus.contributionAmount, tokenDecimals);
              }

              // Calculate payment dates based on current round and group settings
              // ABI Index 7 is currentRound
              const currentRound = Number(info.currentRound ?? tg[7] ?? 0);
              // ABI Index 2 is startDate
              const startTime = Number(info.startDate ?? tg[2] ?? 0);
              // ABI Index 10 is isActive
              const isActive = Boolean(info.isActive ?? tg[10]);
              const contributionInterval = 7 * 24 * 60 * 60; // 7 days in seconds (assuming weekly)

              // Get past recipient from group payouts
              if (groupPayouts && groupPayouts.length > 0) {
                // Get the most recent payout recipient
                const latestPayout = groupPayouts[groupPayouts.length - 1];
                pastRecipient = latestPayout.recipient;
              } else if (currentRecipient && currentRecipient !== '0x0000000000000000000000000000000000000000') {
                // If no payouts yet but there's a current recipient, use that
                pastRecipient = currentRecipient;
              }

              // Only calculate payment dates if group has started and is active
              if (startTime > 0 && isActive) {
                const startDate = new Date(startTime * 1000);
                const lastPayment = new Date(startDate.getTime() + (currentRound * contributionInterval * 1000));
                const nextPayment = new Date(startDate.getTime() + ((currentRound + 1) * contributionInterval * 1000));

                lastPaymentDate = lastPayment;
                nextPaymentDate = nextPayment;

                // User-specific payment dates (same as group for now)
                userLastPayment = lastPayment;
                userNextPayment = nextPayment;
              } else if (startTime > 0 && !isActive) {
                // Group has start time but is not active yet - show start date as next payment
                const startDate = new Date(startTime * 1000);
                nextPaymentDate = startDate;
                userNextPayment = startDate;
              }
            } catch (err) {
              console.warn(`Failed to get payment data for group ${groupId}:`, err);
            }
          }

          const group: ThriftGroup = {
            id: groupId,
            name: `Group ${groupId}`,
            description: 'Thrift Group',
            depositAmount: formatUnits(info.contributionAmount ?? 0, tokenDecimals),
            tokenSymbol,
            tokenAddress,
            maxMembers,
            isPublic: Boolean(info.isPublic),
            isActive: Boolean(info.isActive),
            currentRound: Number(info.currentRound ?? 0),
            totalMembers: Number(info.memberCount ?? members.length ?? 0),
            members: members ?? [],
            contributions: {},
            payoutOrder: payoutOrder ?? [],
            completedPayouts: Number(info.currentCycle ?? 0),
            isUserMember: Boolean(isMember) || (!!account && members.some((m: string) => m.toLowerCase() === account.toLowerCase())),
            lastPaymentDate,
            nextPaymentDate,
            userContribution,
            userLastPayment,
            userNextPayment,
            pastRecipient,
          };

          fetchedGroups.push(group);
          if (group.isUserMember) userGroupsTemp.push(group);
        } catch (err) {
          console.error(`Error fetching group ${groupId}:`, err);
        }
      }

      // Hydrate off-chain metadata for names/descriptions in a single batch request
      try {
        const ids = fetchedGroups.map(g => g.id).join(',');
        if (ids) {
          const res = await fetch(`/api/thrift/metadata?contract=${contractAddress}&ids=${ids}`);
          if (res.ok) {
            const { items } = await res.json();
            const metaMap = new Map<number, any>((items || []).map((it: any) => [Number(it.groupId), it]));
            for (const g of fetchedGroups) {
              const m = metaMap.get(g.id);
              if (m) {
                g.name = m.name || g.name;
                if (m.description) g.description = m.description;
                g.meta = {
                  createdBy: m.createdBy,
                  coverImageUrl: m.coverImageUrl,
                  category: m.category,
                  tags: Array.isArray(m.tags) ? m.tags : [],
                };
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to hydrate thrift metadata:', e);
      }

      setAllGroups(fetchedGroups);
      setUserGroups(userGroupsTemp);
    } catch (err) {
      const errorMsg = `Failed to fetch thrift groups: ${err instanceof Error ? err.message : String(err)}`;
      // Don't set error on public fetch failure if it's just "user not connected" which shouldn't happen with readOnly
      // But if network fails, sure.
      console.error(err);

      // Keep existing groups if refresh fails instead of clearing?
      // Maybe safer to clear if meaningful error.
      // For now, let's just log and not clear everything if it was just one group failure.
      // But here we're catching the whole process error.

      // Auto-clear error after 5 seconds (longer for fetch errors)
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, [contract, readOnlyContract, isConnected, account]);

  // Initial fetch of groups - Runs always
  useEffect(() => {
    // Refresh groups regardless of connection state (public read)
    refreshGroups();
  }, [refreshGroups]);

  // Remove safety check for window.ethereum
  /* 
  useEffect(() => { ... safety check ... }, [isConnected]); 
  */

  // Listen for PayoutDistributed events to update state in real-time
  useEffect(() => {
    if (!contract || !isConnected) {
      console.log('Event listener not set up - contract or connection missing');
      return;
    }

    console.log('Setting up PayoutDistributed event listener');
    const handlePayoutDistributed = (groupId: number, recipient: string, amount: bigint, cycle: bigint) => {
      console.log('PayoutDistributed event received:', { groupId, recipient, amount, cycle });
      console.log('Updating group state for groupId:', groupId, 'to round:', Number(cycle));

      // Update the specific group's state immediately
      setUserGroups(prevGroups =>
        prevGroups.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              currentRound: Number(cycle),
              pastRecipient: recipient,
              // Update next payment date based on new cycle
              nextPaymentDate: group.nextPaymentDate ?
                new Date(group.nextPaymentDate.getTime() + (7 * 24 * 60 * 60 * 1000)) : // Add 7 days
                new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))
            };
          }
          return group;
        })
      );

      // Also update allGroups if it exists
      setAllGroups(prevGroups =>
        prevGroups.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              currentRound: Number(cycle),
              pastRecipient: recipient,
              nextPaymentDate: group.nextPaymentDate ?
                new Date(group.nextPaymentDate.getTime() + (7 * 24 * 60 * 60 * 1000)) :
                new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))
            };
          }
          return group;
        })
      );

      // Show success notification
      toast.success("Payout Distributed", {
        description: `Payout of ${formatUnits(amount, 18)} tokens distributed to ${recipient.substring(0, 6)}...${recipient.substring(recipient.length - 4)}`,
      });
    };

    // Listen for PayoutDistributed events
    contract.contract.on('PayoutDistributed', handlePayoutDistributed);
    console.log('PayoutDistributed event listener registered');

    // Cleanup listener on unmount
    return () => {
      console.log('Cleaning up PayoutDistributed event listener');
      contract.contract.off('PayoutDistributed', handlePayoutDistributed);
    };
  }, [contract, isConnected, toast]);

  // Get contribution history for a group
  const getContributionHistory = async (groupId: number) => {
    try {
      console.log('[ThriftContext] Fetching contribution history for group:', groupId);

      // Call the API route that handles MongoDB caching + blockchain syncing
      const response = await fetch(`/api/thrift/contributions/${groupId}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch contributions');
      }

      console.log('[ThriftContext] Received contributions:', {
        count: data.contributions.length,
        cached: data.cached,
        syncedNewEvents: data.syncedNewEvents
      });

      // Parse date strings back to Date objects for frontend
      data.contributions = data.contributions.map((contrib: any) => ({
        ...contrib,
        date: new Date(contrib.date)
      }));

      // Get group members to update member names if needed
      if (isConnected && contract) {
        try {
          const members = await getThriftGroupMembers(groupId);
          const memberMap = new Map();
          members.forEach(member => {
            memberMap.set(member.address.toLowerCase(), member.userName || member.address);
          });

          // Update member names in contributions
          data.contributions.forEach((contrib: any) => {
            const memberAddress = contrib.member.toLowerCase();
            if (memberMap.has(memberAddress)) {
              contrib.memberName = memberMap.get(memberAddress);
            }
          });
        } catch (memberError) {
          console.warn('[ThriftContext] Could not fetch member names:', memberError);
          // Continue with contributions without member names
        }
      }

      return data.contributions;
    } catch (error) {
      console.error("[ThriftContext] Error fetching contribution history:", error);
      toast.error("Failed to load contribution history. Please try again.");
      return [];
    }
  };

  // LEGACY: Old blockchain querying function (kept for reference, not used)
  const getContributionHistoryLegacy = async (groupId: number) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      console.log('Fetching contribution history for group:', groupId);

      // First, test basic contract connectivity
      try {
        const groupInfo = await contract.getGroupInfo(groupId);
        console.log('Contract connectivity test - Group info:', {
          isActive: groupInfo.isActive,
          memberCount: groupInfo.memberCount,
          contributionAmount: groupInfo.contributionAmount.toString()
        });
      } catch (contractError) {
        console.error('Contract connectivity test failed:', contractError);
        throw new Error('Unable to connect to smart contract');
      }

      // Get group members to map addresses to names
      const members = await getThriftGroupMembers(groupId);
      const memberMap = new Map();
      members.forEach(member => {
        memberMap.set(member.address.toLowerCase(), member.userName || `Member ${Math.random().toString(36).substr(2, 9)}`);
      });

      // Try to get contribution events from the blockchain using Ankr RPC
      let events = [];
      try {
        console.log('Using Ankr RPC provider for event querying...');
        const customContract = new MiniSafeAave(contractAddress, customRpcProvider);
        const customFilter = customContract.contract.filters.ContributionMade(groupId);
        console.log('Filter created:', customFilter);

        // Get current block to limit query range (avoid "block range too large" error)
        const currentBlock = await customRpcProvider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks (~14 hours on Celo)
        console.log(`Querying events from block ${fromBlock} to ${currentBlock}...`);

        events = await customContract.contract.queryFilter(customFilter, fromBlock, currentBlock);
        console.log('Found contribution events:', events.length);

        if (events.length > 0) {
          console.log('First event sample from Fono:', events[0]);
        }
      } catch (rpcError) {
        console.error('RPC endpoint error for event querying:', rpcError);
        console.log('RPC error details:', {
          message: rpcError.message,
          code: (rpcError as any).code,
          data: (rpcError as any).data
        });

        // Try alternative approach - query using getLogs directly
        try {
          console.log('Trying alternative event querying approach...');

          // Get current block number to calculate a reasonable range
          const currentBlock = await customRpcProvider.getBlockNumber();
          console.log('Current block number:', currentBlock);

          // Query last 5k blocks to avoid limitations
          const fromBlock = Math.max(0, currentBlock - 5000);
          console.log(`Querying events from block ${fromBlock} to ${currentBlock}`);

          const allEvents = await (customRpcProvider as any).getLogs({
            address: contractAddress,
            fromBlock: fromBlock,
            toBlock: currentBlock,
            topics: ['0x0a4a91237423e0a1766a761c7cb029311d8b95d6b1b81db1b949a70c98b4e08e'] // ContributionMade event signature
          });
          console.log('Total events found:', allEvents.length);

          // Filter for specific group ID
          events = allEvents.filter(event => {
            const eventData = event as any;
            return eventData.topics &&
              eventData.topics[1] &&
              eventData.topics[1].includes(groupId.toString(16).padStart(64, '0')); // Group ID in topics
          });
          console.log('Manually filtered ContributionMade events:', events.length);
        } catch (altError) {
          console.error('Alternative event querying also failed:', altError);

          // Final fallback - try wallet RPC with limited range
          try {
            console.log('Trying wallet RPC as final fallback...');
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 5000);
            const filter = contract.contract.filters.ContributionMade(groupId);
            events = await contract.contract.queryFilter(filter, fromBlock, currentBlock);
            console.log('Found contribution events with wallet RPC:', events.length);
          } catch (walletError) {
            console.error('Wallet RPC also failed:', walletError);
            return [];
          }
        }
      }

      const contributions = [];

      for (const event of events) {
        try {
          // Type assertion to handle ethers event types
          const eventData = event as any;
          if (eventData.args && eventData.args.member && eventData.args.amount) {
            const memberAddress = eventData.args.member;
            const amount = eventData.args.amount;

            // Try to get block timestamp, fallback to current time if RPC fails
            let contributionDate = new Date();
            try {
              // Try wallet provider first
              const block = await provider?.getBlock(event.blockNumber);
              if (block) {
                contributionDate = new Date(block.timestamp * 1000);
              }
            } catch (blockError) {
              console.warn('Wallet provider failed to fetch block timestamp, trying custom RPC:', blockError);
              try {
                // Fallback to custom RPC provider
                const block = await customRpcProvider.getBlock(event.blockNumber);
                if (block) {
                  contributionDate = new Date(block.timestamp * 1000);
                }
              } catch (customBlockError) {
                console.warn('Custom RPC also failed to fetch block timestamp, using current time:', customBlockError);
              }
            }

            // Get token info for formatting
            const groupInfo = await contract.getGroupInfo(groupId);
            const thriftGroup = await contract.getThriftGroup(groupId);
            const tokenAddress = thriftGroup.tokenAddress || thriftGroup[6];
            const tokenConfig = getTokenByAddress(tokenAddress);
            const tokenSymbol = tokenConfig?.symbol || 'CELO';
            const decimals = tokenConfig?.decimals || 18;

            contributions.push({
              date: contributionDate,
              member: memberAddress,
              memberName: memberMap.get(memberAddress.toLowerCase()) || `Member ${Math.random().toString(36).substr(2, 9)}`,
              amount: formatUnits(amount, decimals),
              tokenSymbol,
              transactionHash: event.transactionHash
            });
          }
        } catch (eventError) {
          console.warn('Error processing contribution event:', eventError);
        }
      }

      // Sort by date (newest first)
      contributions.sort((a, b) => b.date.getTime() - a.date.getTime());

      console.log('Processed contributions:', contributions);
      return contributions;

    } catch (error) {
      console.error('Failed to fetch contribution history:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  };

  // Debug function to test blockchain timestamp capture
  const testBlockchainTimestamp = async (groupId: number) => {
    if (!provider) {
      console.error('No provider available');
      return;
    }

    try {
      // Get the latest block to test timestamp capture
      const latestBlock = await provider.getBlock('latest');
      console.log('Latest block info:', {
        number: latestBlock.number,
        timestamp: latestBlock.timestamp,
        date: new Date(latestBlock.timestamp * 1000).toISOString()
      });

      // Try to get a specific block (if we know one)
      if (latestBlock.number > 0) {
        const testBlock = await provider.getBlock(latestBlock.number - 1);
        console.log('Previous block info:', {
          number: testBlock.number,
          timestamp: testBlock.timestamp,
          date: new Date(testBlock.timestamp * 1000).toISOString()
        });
      }

      // Test database data
      const response = await fetch(`/api/debug/group-members?groupId=${groupId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Database debug data:', data);
      } else {
        console.error('Failed to fetch debug data:', response.status);
      }
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  const value = {
    userGroups,
    allGroups,
    createThriftGroup,
    joinThriftGroup,
    checkJoinStatus,
    checkGroupStatus,
    addMemberToPrivateGroup,
    makeContribution,
    distributePayout,
    getThriftGroupMembers,
    getContributionHistory,
    generateShareLink,
    // Admin functions
    activateThriftGroup,
    setPayoutOrder,
    emergencyWithdraw,
    getThriftGroupDetails, // Added new function
    // Debug functions
    testBlockchainTimestamp,
    loading,
    error,
    refreshGroups,
    initialize,
    // Expose connection state for hooks
    isConnected,
    account,
    contract
  };

  return <ThriftContext.Provider value={value}>{children}</ThriftContext.Provider>;
};

export const useThrift = (): ThriftContextType => {
  const context = useContext(ThriftContext);
  if (context === undefined) {
    throw new Error("useThrift must be used within a ThriftProvider");
  }
  return context;
};