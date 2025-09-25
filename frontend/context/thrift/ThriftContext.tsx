"use client";
import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { contractAddress, MiniSafeAave } from '@/utils/abi';
import { getTokenByAddress, TOKENS } from '@/utils/tokens';
import { BrowserProvider, formatUnits, parseUnits } from "ethers";

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
  contributionAmount: string;
  joinDate: string;
  hasContributed: boolean;
  payoutPosition?: number;
}

export interface ThriftContextType {
  userGroups: ThriftGroup[];
  allGroups: ThriftGroup[];
  createThriftGroup: (name: string, description: string, depositAmount: string, maxMembers: number, isPublic: boolean, tokenAddress?: string, startDate?: Date) => Promise<void>;
  joinThriftGroup: (groupId: number) => Promise<void>;
  addMemberToPrivateGroup: (groupId: number, memberAddress: string) => Promise<void>;
  makeContribution: (groupId: number) => Promise<void>;
  distributePayout: (groupId: number) => Promise<void>;
  getThriftGroupMembers: (groupId: number) => Promise<ThriftMember[]>;
  generateShareLink: (groupId: number) => string;
  // Admin functions
  activateThriftGroup: (groupId: number) => Promise<void>;
  setPayoutOrder: (groupId: number, payoutOrder: string[]) => Promise<void>;
  emergencyWithdraw: (groupId: number) => Promise<void>;
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
          toast({ title: 'Unsupported token', description: msg });
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
        toast({ title: 'Unsupported token', description: msg });
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
          toast({ title: 'Amount too low', description: msg });
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
      
      toast({ title: "Success", description: "Thrift group created successfully!" });
    } catch (err) {
      console.error("Failed to create thrift group:", err);
      setError(`Failed to create thrift group: ${err instanceof Error ? err.message : String(err)}`);
      toast({ title: "Error", description: `Failed to create thrift group: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  // Join public thrift group contract interaction
  const joinThriftGroup = async (groupId: number) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.joinPublicGroup(groupId);
      await tx.wait();
      
      // Store join date in database
      try {
        await fetch(`/api/groups/${groupId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAddress: account,
            role: 'member'
          }),
        });
      } catch (dbError) {
        console.warn('Could not store join date in database:', dbError);
        // Don't fail the entire operation if database storage fails
      }
      
      await refreshGroups();
      toast({ title: "Success", description: "Successfully joined the thrift group!" });
    } catch (err) {
      console.error("Failed to join thrift group:", err);
      setError(`Failed to join thrift group: ${err instanceof Error ? err.message : String(err)}`);
      toast({ title: "Error", description: `Failed to join thrift group: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
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
      toast({ title: "Success", description: "Member added successfully!" });
    } catch (err) {
      console.error("Failed to add member:", err);
      setError(`Failed to add member: ${err instanceof Error ? err.message : String(err)}`);
      toast({ title: "Error", description: `Failed to add member: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  // Make contribution contract interaction
  const makeContribution = async (groupId: number) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);
      
      // First check if we can estimate gas (this will catch the error early)
      try {
        await (contract.makeContribution as any).estimateGas(groupId);
      } catch (gasError: any) {
        if (gasError.message && gasError.message.includes("Group is not active")) {
          throw new Error("Group is not active. Please wait for the admin to activate the group before contributing.");
        }
        throw gasError;
      }
      
      const tx = await contract.makeContribution(groupId);
      await tx.wait();
      
      await refreshGroups();
    } catch (err) {
      setError(`Failed to contribute: ${err instanceof Error ? err.message : String(err)}`);
      throw err; // Re-throw so the page component can handle the error
    } finally {
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
      
      // Get group info to use start time for join dates
      let groupStartTime = Date.now();
      try {
        const groupInfo = await contract.getGroupInfo(groupId);
        if (groupInfo && groupInfo.startTime) {
          groupStartTime = Number(groupInfo.startTime) * 1000; // Convert from seconds to milliseconds
        }
      } catch (err) {
        console.warn('Could not get group start time, using current time');
      }

      // Try to get accurate join dates from database
      let dbJoinDates: { [address: string]: string } = {};
      try {
        const response = await fetch(`/api/groups/${groupId}/members`);
        if (response.ok) {
          const data = await response.json();
          if (data.members && data.members.length > 0) {
            // Create a map of address -> joinDate for quick lookup
            data.members.forEach((member: any) => {
              dbJoinDates[member.address.toLowerCase()] = new Date(member.joinedAt).toISOString();
            });
            console.log(`✅ Retrieved ${Object.keys(dbJoinDates).length} join dates from database for group ${groupId}`);
          }
        }
      } catch (dbError) {
        console.warn('Could not fetch join dates from database, using calculated dates:', dbError);
      }
      
      return members.map((address: string, index: number) => {
        // Prioritize database join date, fallback to calculated date
        let joinDate: string;
        
        if (dbJoinDates[address.toLowerCase()]) {
          // Use database join date (most accurate)
          joinDate = dbJoinDates[address.toLowerCase()];
          console.log(`📅 Using database join date for ${address}: ${joinDate}`);
        } else {
          // Fallback to calculated date from group start time
          joinDate = new Date(groupStartTime + (index * 24 * 60 * 60 * 1000)).toISOString();
          console.log(`📅 Using calculated join date for ${address}: ${joinDate}`);
        }
        
        return {
          address,
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
      
      const tx = await contract.distributePayout(groupId);
      await tx.wait();
      
      await refreshGroups();
      toast({ title: "Success", description: "Payout distributed successfully!" });
    } catch (err) {
      console.error("Failed to distribute payout:", err);
      setError(`Failed to distribute payout: ${err instanceof Error ? err.message : String(err)}`);
      toast({ title: "Error", description: `Failed to distribute payout: ${err instanceof Error ? err.message : String(err)}` });
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
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      
      // First check if we can estimate gas (this will catch the error early)
      try {
        await (contract.activateThriftGroup as any).estimateGas(groupId);
      } catch (gasError: any) {
        if (gasError.message && gasError.message.includes("Payout order not set")) {
          throw new Error("Payout order not set. Please set the payout order before activating the group.");
        }
        throw gasError;
      }
      
      const tx = await contract.activateThriftGroup(groupId);
      await tx.wait();
      await refreshGroups();
    } catch (error) {
      // Handle specific error cases with better error messages
      if (error instanceof Error) {
        if (error.message.includes("Payout order not set")) {
          throw new Error("Payout order not set. Please set the payout order before activating the group.");
        } else if (error.message.includes("execution reverted")) {
          throw new Error("Unable to activate group. Please check that all requirements are met and try again.");
        }
      }
      
      throw error;
    } finally {
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

  const value = {
    userGroups,
    allGroups,
    createThriftGroup,
    joinThriftGroup,
    addMemberToPrivateGroup,
    makeContribution,
    distributePayout,
    getThriftGroupMembers,
    generateShareLink,
    // Admin functions
    activateThriftGroup,
    setPayoutOrder,
    emergencyWithdraw,
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