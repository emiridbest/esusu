"use client";
import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { contractAddress, MiniSafeAave } from '@/utils/abi';
import { getTokenByAddress, TOKENS } from '@/utils/tokens';
import { BrowserProvider, formatUnits, parseUnits, Contract, JsonRpcProvider } from "ethers";

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
  createThriftGroup: (name: string, description: string, depositAmount: string, maxMembers: number, isPublic: boolean, tokenAddress?: string, startDate?: Date) => Promise<void>;
  joinThriftGroup: (groupId: number, userName?: string) => Promise<void>;
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
  addMemberToPrivateGroup: (groupId: number, memberAddress: string) => Promise<void>;
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
  // Debug functions
  testBlockchainTimestamp: (groupId: number) => Promise<void>;
  loading: boolean;
  error: string | null;
  refreshGroups: () => Promise<void>;
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
  const [contract, setContract] = useState<MiniSafeAave | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Custom RPC provider for event querying (fallback when wallet RPC is down)
  const customRpcProvider = new JsonRpcProvider('https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8');

  // Initialize provider, account, and contract
  const initialize = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // Initialize provider
        const ethersProvider = new BrowserProvider(window.ethereum);
        setProvider(ethersProvider);

        // Get accounts
        const accounts = await ethersProvider.listAccounts();
        
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0].address);
          setIsConnected(true);
          
          // Initialize MiniSafeAave contract
          const signer = await ethersProvider.getSigner();
          const miniSafeContract = new MiniSafeAave(contractAddress, signer);
          setContract(miniSafeContract);
        } else {
          setIsConnected(false);
          setAccount(null);
        }
      }
    } catch (err) {
      console.error("Failed to initialize wallet connection:", err);
      setError("Failed to connect to wallet. Please make sure MetaMask is installed and connected.");
      setIsConnected(false);
    }
  }, []);

  // Call initialize function when the component mounts
  useEffect(() => {
    initialize();
    
    // Setup listeners for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          setIsConnected(false);
          setAccount(null);
          setContract(null);
        } else {
          // Account changed, reinitialize
          await initialize();
        }
      };
      
      const handleChainChanged = () => {
        // When chain changes, we need to reinitialize
        window.location.reload();
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [initialize]);

  // Create thrift group contract interaction
  const createThriftGroup = async (name: string, description: string, depositAmount: string, maxMembers: number, isPublic: boolean, tokenAddress?: string, startDate?: Date) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);
      
      const startTimestamp = startDate ? Math.floor(startDate.getTime() / 1000) : Math.floor(Date.now() / 1000);

      // Use provided token address or determine a supported token
      let finalTokenAddress = tokenAddress;
      
      if (!finalTokenAddress) {
        const supportedTokens: string[] = await contract.getSupportedTokens();
        if (!supportedTokens || supportedTokens.length === 0) {
          const msg = 'No supported tokens configured on the contract. Please contact the admin to add supported tokens.';
          setError(msg);
          toast.error('Unsupported token', { description: msg });
          return;
        }

        // Preferred token: env override -> cUSD -> first supported
        const preferredEnv = (process.env.NEXT_PUBLIC_THRIFT_TOKEN_ADDRESS || '').toLowerCase();
        finalTokenAddress = (supportedTokens.find(a => a.toLowerCase() === preferredEnv)
          || supportedTokens.find(a => a.toLowerCase() === CUSD_TOKEN_ADDRESS.toLowerCase())
          || supportedTokens[0]) as string;
      }

      // Validate chosen token
      const valid = await contract.isValidToken(finalTokenAddress);
      if (!valid) {
        const msg = `Chosen token ${finalTokenAddress} is not supported by the contract.`;
        setError(msg);
        toast.error('Unsupported token', { description: msg });
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        minContribution = await (contract as any).contract.MIN_CONTRIBUTION();
      } catch (_) {
        // If not accessible, proceed without check
      }
      if (minContribution !== undefined) {
        // Both are bigint in ethers v6; avoid BigInt literals by comparing directly
        if (amount < minContribution) {
          const msg = `Deposit amount is below the minimum contribution: ${formatUnits(minContribution, 18)}.`;
          setError(msg);
          toast.error('Amount too low', { description: msg });
          return;
        }
      }

      const tx = await contract.createThriftGroup(amount, startTimestamp, isPublic, finalTokenAddress);
      const receipt = await tx.wait();

      // Try to parse the emitted event to get the new groupId
      let newGroupId: number | null = null;
      try {
        // Use the underlying ethers Contract interface from our wrapper to parse logs
        const iface = (contract as any).contract.interface;
        for (const log of receipt.logs ?? []) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === 'ThriftGroupCreated') {
              const arg = (parsed.args as any)?.groupId ?? (parsed.args as any)?.[0];
              if (arg !== undefined && arg !== null) {
                newGroupId = Number(arg.toString());
                break;
              }
            }
          } catch (_) {
            // not our event
          }
        }
      } catch (e) {
        console.warn('Unable to parse ThriftGroupCreated event:', e);
      }

      // Fallback: use totalThriftGroups as the latest id if event parsing failed
      if (!newGroupId) {
        try {
          const total = await contract.totalThriftGroups();
          newGroupId = Number(total);
        } catch (_) {
          // ignore
        }
      }

      // Persist off-chain metadata (best-effort) with signature auth
      try {
        if (newGroupId && provider && account) {
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
          const signer = await provider.getSigner();
          const signature = await signer.signMessage(msg);

          await fetch('/api/thrift/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contractAddress,
              groupId: newGroupId,
              name,
              description,
              signerAddress: account,
              signature,
              timestamp: ts,
            }),
          });
        }
      } catch (metaErr) {
        console.warn('Failed to save thrift metadata:', metaErr);
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
      setError(`Failed to create thrift group: ${err instanceof Error ? err.message : String(err)}`);
      toast.error(`Failed to create thrift group: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Check join status for a group
  const checkJoinStatus = async (groupId: number) => {
    if (!contract || !account) {
      return { isMember: false, groupInfo: null, canJoin: false, reason: 'Wallet not connected' };
    }

    try {
      const groupInfo = await contract.getThriftGroup(groupId);
      if (!groupInfo || groupInfo.contributionAmount === 0) {
        return { isMember: false, groupInfo: null, canJoin: false, reason: 'Group not found' };
      }

      const isMember = await contract.isGroupMember(groupId, account);
      
      let canJoin = false;
      let reason = '';
      
      if (isMember) {
        reason = 'You are already a member of this group';
      } else if (!groupInfo.isPublic) {
        reason = 'This is a private group. You need an invitation to join.';
      } else if (groupInfo.totalMembers >= groupInfo.maxMembers) {
        reason = 'Group is full';
      } else if (!groupInfo.isActive && groupInfo.totalMembers < groupInfo.maxMembers) {
        reason = 'Group is not active yet';
      } else {
        canJoin = true;
      }

      return {
        isMember,
        groupInfo: {
          exists: true,
          isPublic: groupInfo.isPublic,
          totalMembers: Number(groupInfo.totalMembers),
          maxMembers: Number(groupInfo.maxMembers),
          isActive: groupInfo.isActive,
          contributionAmount: groupInfo.contributionAmount.toString()
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
  const joinThriftGroup = async (groupId: number, userName?: string) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);
      
      // Check if group exists and is joinable before attempting to join
      const status = await checkJoinStatus(groupId);
      if (!status.canJoin) {
        throw new Error(status.reason || 'Cannot join this group');
      }
      
      console.log('Attempting to join group:', groupId);
      const tx = await contract.joinPublicGroup(groupId);
      console.log('Join transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Join transaction confirmed');
      
      // Get the actual join date from the blockchain transaction
      let actualJoinDate = new Date();
      try {
        console.log('Attempting to get block timestamp from receipt:', {
          blockNumber: receipt.blockNumber,
          provider: !!provider,
          receipt: receipt
        });
        
        // Get the block timestamp from the transaction receipt
        if (provider && receipt.blockNumber) {
          const block = await provider.getBlock(receipt.blockNumber);
          if (block && block.timestamp) {
            actualJoinDate = new Date(block.timestamp * 1000); // Convert from seconds to milliseconds
            console.log('✅ Actual join date from blockchain:', {
              blockNumber: receipt.blockNumber,
              blockTimestamp: block.timestamp,
              actualJoinDate: actualJoinDate.toISOString(),
              currentTime: new Date().toISOString()
            });
          } else {
            console.warn('Block data missing timestamp:', block);
          }
        } else {
          console.warn('Provider or block number missing:', { provider: !!provider, blockNumber: receipt.blockNumber });
        }
      } catch (blockError) {
        console.error('Failed to get block timestamp:', blockError);
        console.warn('Using current time as fallback');
      }
      
      // Store join date in database with the actual blockchain timestamp
      try {
        const memberData = {
          userAddress: account,
          role: 'member',
          joinDate: actualJoinDate.toISOString(), // Send the actual blockchain timestamp
          userName: userName || `Member ${Date.now()}` // Send the user name
        };
        
        console.log('Storing member data in database:', memberData);
        
        const response = await fetch(`/api/groups/${groupId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(memberData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Database storage failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          // Still show success but warn about database issue
          toast.warning("Partially successful", {
            description: "Joined group but couldn't store join date. Please refresh the page."
          });
        } else {
          const responseData = await response.json();
          console.log('✅ Join date stored in database successfully:', {
            actualJoinDate: actualJoinDate.toISOString(),
            response: responseData
          });
        }
      } catch (dbError) {
        console.error('Database storage failed:', dbError);
        // Still show success but warn about database issue
        toast.warning("Partially successful", {
          description: "Joined group but couldn't store join date. Please refresh the page."
        });
      }
      
      await refreshGroups();
      toast.success("Successfully joined the thrift group!");
    } catch (err) {
      console.error("Failed to join thrift group:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to join thrift group: ${errorMessage}`);
      toast.error(`Failed to join thrift group: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Check group status (active, started, can contribute)
  const checkGroupStatus = async (groupId: number) => {
    if (!contract) {
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
      const groupInfo = await contract.getGroupInfo(groupId);
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
      const thriftGroup = await contract.getThriftGroup(groupId);
      
      // Both groupInfo and thriftGroup have isActive fields
      // Based on the ABI, groupInfo.isActive should be the main indicator
      const isActive = Boolean(groupInfo.isActive);
      
      // For "started" state, we need to check if the group has actually begun
      // This could be based on startDate, currentRound, or other indicators
      const startDate = Number(thriftGroup.startDate || 0);
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
  const addMemberToPrivateGroup = async (groupId: number, memberAddress: string) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.addMemberToPrivateGroup(groupId, memberAddress);
      await tx.wait();
      
      await refreshGroups();
      toast.success("Member added successfully!");
    } catch (err) {
      console.error("Failed to add member:", err);
      setError(`Failed to add member: ${err instanceof Error ? err.message : String(err)}`);
      toast.error(`Failed to add member: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Make contribution contract interaction
  const makeContribution = async (groupId: number) => {
    console.log('makeContribution called with groupId:', groupId);
    
    if (!contract || !isConnected) {
      console.log('makeContribution: Contract or connection not available');
      throw new Error("Wallet not connected or contract not initialized");
    }

    if (!contract.makeContribution) {
      console.error('makeContribution method not found on contract');
      throw new Error("Contract method not available");
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
      const isMember = await contract.isGroupMember(groupId, account);
      console.log('User is member of group:', isMember);
      if (!isMember) {
        throw new Error("You are not a member of this group. Please join the group before contributing.");
      }
    } catch (memberCheckError) {
      console.error('Failed to check membership:', memberCheckError);
      // Don't throw here, let the contract call handle it
    }

    try {
      console.log('makeContribution: Setting loading to true');
      setLoading(true);
      setError(null);
      
      // Get detailed group status before attempting contribution
      const detailedStatus = await checkGroupStatus(groupId);
      console.log('makeContribution: Detailed group status:', detailedStatus);
      
      // Also check the raw contract data
      const groupInfo = await contract.getGroupInfo(groupId);
      const thriftGroup = await contract.getThriftGroup(groupId);
      console.log('makeContribution: Raw contract data:', {
        groupInfo: {
          isActive: groupInfo.isActive,
          startDate: groupInfo.startDate,
          currentRound: groupInfo.currentRound,
          memberCount: groupInfo.memberCount
        },
        thriftGroup: {
          isActive: thriftGroup.isActive,
          startDate: thriftGroup.startDate,
          currentRound: thriftGroup.currentRound,
          maxMembers: thriftGroup.maxMembers
        }
      });

      // Get token information for approval
      const tokenAddress = thriftGroup.tokenAddress || thriftGroup[6];
      const contributionAmount = groupInfo.contributionAmount;
      
      console.log('makeContribution: Token approval check:', {
        tokenAddress,
        contributionAmount: contributionAmount.toString(),
        contractAddress: contract.address
      });

      // Check and handle token approval
      if (tokenAddress && contributionAmount > 0) {
        try {
          // Create ERC20 contract instance for approval
          const erc20Abi = [
            "function approve(address spender, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function balanceOf(address owner) view returns (uint256)"
          ];
          
          const erc20Contract = new Contract(tokenAddress, erc20Abi, provider) as any;
          const signer = await provider.getSigner();
          const erc20WithSigner = erc20Contract.connect(signer);
          
          // Check current allowance
          const currentAllowance = await (erc20WithSigner as any).allowance(account, contract.address);
          console.log('Current allowance:', currentAllowance.toString());
          
          // Check user balance
          const userBalance = await (erc20WithSigner as any).balanceOf(account);
          console.log('User balance:', userBalance.toString());
          
          if (userBalance < contributionAmount) {
            const userBalanceFormatted = formatUnits(userBalance, 18);
            const requiredAmountFormatted = formatUnits(contributionAmount, 18);
            
            console.log('Showing insufficient balance toast:', {
              userBalance: userBalanceFormatted,
              required: requiredAmountFormatted
            });
            
            try {
              toast.error("Insufficient Token Balance", {
                description: `You have ${userBalanceFormatted} tokens but need ${requiredAmountFormatted} tokens to make this contribution.`,
              });
              console.log('Toast notification sent successfully');
            } catch (toastError) {
              console.error('Failed to show toast:', toastError);
            }
            
            // Return early instead of throwing error to prevent console error
            return;
          }
          
          // If allowance is insufficient, request approval
          if (currentAllowance < contributionAmount) {
            console.log('Insufficient allowance, requesting approval...');
            toast.info("Approval Required", {
              description: "Please approve the contract to spend your tokens. This is a one-time transaction."
            });
            
            const approvalTx = await (erc20WithSigner as any).approve(contract.address, contributionAmount);
            console.log('Approval transaction sent:', approvalTx.hash);
            
            console.log('Waiting for approval confirmation...');
            await approvalTx.wait();
            console.log('Approval confirmed');
            
            toast.success("Approval Confirmed", {
              description: "Token approval successful. Proceeding with contribution..."
            });
          } else {
            console.log('Sufficient allowance already exists');
          }
        } catch (approvalError) {
          console.error('Token approval failed:', approvalError);
          if (approvalError instanceof Error) {
            if (approvalError.message.includes("user rejected")) {
              throw new Error("Token approval was cancelled by user.");
            } else if (approvalError.message.includes("Insufficient token balance")) {
              throw approvalError;
            }
          }
          throw new Error(`Token approval failed: ${approvalError instanceof Error ? approvalError.message : String(approvalError)}`);
        }
      }
      
      console.log('makeContribution: Calling contract.makeContribution...');
      console.log('Contract methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(contract)));
      console.log('makeContribution method exists:', typeof contract.makeContribution);
      console.log('Contract address:', contract.address);
      console.log('Group ID being passed:', groupId);
      
      const tx = await contract.makeContribution(groupId);
      console.log('makeContribution: Transaction sent:', tx.hash);
      
      console.log('makeContribution: Waiting for transaction confirmation...');
      await tx.wait();
      console.log('makeContribution: Transaction confirmed');
      
      console.log('makeContribution: Refreshing groups...');
      await refreshGroups();
      console.log('makeContribution: Groups refreshed');
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
          throw err; // Re-throw approval errors as they already have good messages
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
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      // Primary: Fetch members from contract (authoritative blockchain data)
      const members: string[] = await contract.getGroupMembers(groupId);
      
      // Fetch join dates from cached blockchain API (ALWAYS - this is the source of truth)
      let dbMemberData: { [address: string]: { joinDate: string; userName: string } } = {};
      
      console.log(`🔍 Fetching join dates from cached blockchain API for group ${groupId}`);
      try {
        const blockchainResponse = await fetch(`/api/thrift/join-dates-cached/${groupId}`);
        if (blockchainResponse.ok) {
          const blockchainData = await blockchainResponse.json();
          console.log('📅 Cached join dates response:', blockchainData);
          
          if (blockchainData.success && blockchainData.joinDates) {
            // Use blockchain data as the primary source
            let memberIndex = 1;
            Object.keys(blockchainData.joinDates).forEach(address => {
              dbMemberData[address.toLowerCase()] = {
                joinDate: blockchainData.joinDates[address],
                userName: `Member ${memberIndex}`
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
      
      return members.map((address: string, index: number) => {
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
      setError(`Failed to distribute payout: ${err instanceof Error ? err.message : String(err)}`);
      toast.error(`Failed to distribute payout: ${err instanceof Error ? err.message : String(err)}`);
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
    console.log('activateThriftGroup called with groupId:', groupId);
    
    if (!contract || !isConnected) {
      console.log('activateThriftGroup: Contract or connection not available');
      console.log('Contract:', contract);
      console.log('Is connected:', isConnected);
      throw new Error("Wallet not connected or contract not initialized");
    }

    if (!contract.activateThriftGroup) {
      console.error('activateThriftGroup method not found on contract');
      throw new Error("Contract method not available");
    }

    try {
      console.log('activateThriftGroup: Setting loading to true');
      setLoading(true);
      
      console.log('activateThriftGroup: Calling contract.activateThriftGroup...');
      console.log('Contract methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(contract)));
      console.log('activateThriftGroup method exists:', typeof contract.activateThriftGroup);
      
      const tx = await contract.activateThriftGroup(groupId);
      console.log('activateThriftGroup: Transaction sent:', tx.hash);
      
      console.log('activateThriftGroup: Waiting for transaction confirmation...');
      await tx.wait();
      console.log('activateThriftGroup: Transaction confirmed');
      
      console.log('activateThriftGroup: Refreshing groups...');
      await refreshGroups();
      console.log('activateThriftGroup: Groups refreshed');
    } catch (error) {
      console.error('activateThriftGroup: Error occurred:', error);
      
      // Handle specific error cases with better error messages
      if (error instanceof Error) {
        if (error.message.includes("Payout order not set")) {
          throw new Error("Payout order not set. Please set the payout order before activating the group.");
        } else if (error.message.includes("execution reverted")) {
          throw new Error("Unable to activate group. Please check that all requirements are met and try again.");
        } else if (error.message.includes("user rejected")) {
          throw new Error("Transaction was cancelled by user.");
        } else if (error.message.includes("insufficient funds")) {
          throw new Error("Insufficient funds to complete the transaction.");
        }
      }
      
      throw error;
    } finally {
      console.log('activateThriftGroup: Setting loading to false');
      setLoading(false);
    }
  };

  const setPayoutOrder = async (groupId: number, payoutOrder: string[]): Promise<void> => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      const tx = await contract.setPayoutOrder(groupId, payoutOrder);
      await tx.wait();
      await refreshGroups();
    } catch (error) {
      console.error("Failed to set payout order:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const emergencyWithdraw = async (groupId: number): Promise<void> => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      const tx = await contract.emergencyWithdraw(groupId);
      await tx.wait();
      await refreshGroups();
    } catch (error) {
      console.error("Failed to execute emergency withdrawal:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch all thrift groups
  const refreshGroups = async () => {
    if (!contract || !isConnected || !account) {
      setUserGroups([]);
      setAllGroups([]);
      setError('Please connect your wallet to view thrift groups.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fetchedGroups: ThriftGroup[] = [];
      const userGroupsTemp: ThriftGroup[] = [];

      // Determine total groups from contract and iterate 1..total
      const totalGroupsBn = await contract.totalThriftGroups();
      const totalGroups = Number(totalGroupsBn);
      if (totalGroups === 0) {
        setAllGroups([]);
        setUserGroups([]);
        return;
      }

      const groupIds = Array.from({ length: totalGroups }, (_, i) => i + 1);

      // Fetch all groups in parallel per group for better UX
      for (const groupId of groupIds) {
        try {
          // Parallel fetch with error handling for non-existent groups
          const [info, members, payoutOrder, isMember, currentRecipient, groupPayouts] = await Promise.all([
            contract.getGroupInfo(groupId).catch(() => null),
            contract.getGroupMembers(groupId).catch(() => []),
            contract.getPayoutOrder(groupId).catch(() => []),
            account ? contract.isGroupMember(groupId, account).catch(() => false) : Promise.resolve(false),
            contract.getCurrentRecipient(groupId).catch(() => null),
            contract.getGroupPayouts(groupId).catch(() => []),
          ]);

          // Skip uninitialized groups (contributionAmount == 0) without using BigInt literals
          const contributionAmountStr = info?.contributionAmount?.toString?.() ?? '0';
          if (!info || contributionAmountStr === '0') continue;

          // Try to get maxMembers and token info from thriftGroups mapping
          let maxMembers = members?.length ?? 0;
          let tokenAddress = '';
          let tokenSymbol = 'cUSD'; // Default fallback
          let tokenDecimals = 18; // Default fallback
          
          try {
            const tg = await contract.getThriftGroup(groupId);
            // Support both object and array returns
            maxMembers = Number((tg.maxMembers ?? tg[5] ?? maxMembers));
            // Get token address from contract data
            tokenAddress = tg.tokenAddress ?? tg[6] ?? '';
            
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

          // Get user payment data from blockchain
          let userContribution = '0';
          let userLastPayment: Date | undefined;
          let userNextPayment: Date | undefined;
          let lastPaymentDate: Date | undefined;
          let nextPaymentDate: Date | undefined;
          let pastRecipient: string | undefined;

          if (account) {
            try {
              // Get user's contribution status
              const contributionStatus = await contract.checkContributionDue(account, groupId);
              if (contributionStatus && contributionStatus.contributionAmount) {
                userContribution = formatUnits(contributionStatus.contributionAmount, tokenDecimals);
              }
              
              // Calculate payment dates based on current round and group settings
              const currentRound = Number(info.currentRound ?? 0);
              const startTime = Number(info.startTime ?? 0);
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
              if (startTime > 0 && info.isActive) {
                const startDate = new Date(startTime * 1000);
                const lastPayment = new Date(startDate.getTime() + (currentRound * contributionInterval * 1000));
                const nextPayment = new Date(startDate.getTime() + ((currentRound + 1) * contributionInterval * 1000));
                
                lastPaymentDate = lastPayment;
                nextPaymentDate = nextPayment;
                
                // User-specific payment dates (same as group for now)
                userLastPayment = lastPayment;
                userNextPayment = nextPayment;
              } else if (startTime > 0 && !info.isActive) {
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
            isUserMember: Boolean(isMember),
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
      setError(`Failed to fetch thrift groups: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
      setUserGroups([]);
      setAllGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch of groups when the user connects
  useEffect(() => {
    if (isConnected && contract) {
      refreshGroups();
    } else {
      setUserGroups([]);
      setAllGroups([]);
    }
  }, [isConnected, contract]);

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
    // Debug functions
    testBlockchainTimestamp,
    loading,
    error,
    refreshGroups
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