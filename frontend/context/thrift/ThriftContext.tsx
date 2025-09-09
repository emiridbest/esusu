"use client";
import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { contractAddress, MiniSafeAave } from '@/utils/abi';
import { BrowserProvider, formatUnits, parseUnits } from "ethers";

// Define the type for thrift group data (updated to match contract structure)
export interface ThriftGroup {
  id: number;
  name: string;
  description: string;
  depositAmount: string;
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
  createThriftGroup: (name: string, description: string, depositAmount: string, maxMembers: number, isPublic: boolean) => Promise<void>;
  joinThriftGroup: (groupId: number) => Promise<void>;
  addMemberToPrivateGroup: (groupId: number, memberAddress: string) => Promise<void>;
  makeContribution: (groupId: number) => Promise<void>;
  distributePayout: (groupId: number) => Promise<void>;
  getThriftGroupMembers: (groupId: number) => Promise<ThriftMember[]>;
  generateShareLink: (groupId: number) => string;
  loading: boolean;
  error: string | null;
  refreshGroups: () => Promise<void>;
}

// Celo token addresses
const CELO_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
const CUSD_TOKEN_ADDRESS = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

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
  const createThriftGroup = async (name: string, description: string, depositAmount: string, maxMembers: number, isPublic: boolean) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);
      
      const amount = parseUnits(depositAmount, 18);
      const startDate = Math.floor(Date.now() / 1000);

      // Determine a supported token to use
      const supportedTokens: string[] = await contract.getSupportedTokens();
      if (!supportedTokens || supportedTokens.length === 0) {
        const msg = 'No supported tokens configured on the contract. Please contact the admin to add supported tokens.';
        setError(msg);
        toast({ title: 'Unsupported token', description: msg });
        return;
      }

      // Preferred token: env override -> cUSD -> first supported
      const preferredEnv = (process.env.NEXT_PUBLIC_THRIFT_TOKEN_ADDRESS || '').toLowerCase();
      const tokenAddress = (supportedTokens.find(a => a.toLowerCase() === preferredEnv)
        || supportedTokens.find(a => a.toLowerCase() === CUSD_TOKEN_ADDRESS.toLowerCase())
        || supportedTokens[0]) as string;

      // Validate chosen token
      const valid = await contract.isValidToken(tokenAddress);
      if (!valid) {
        const msg = `Chosen token ${tokenAddress} is not supported by the contract.`;
        setError(msg);
        toast({ title: 'Unsupported token', description: msg });
        return;
      }

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

      const tx = await contract.createThriftGroup(amount, startDate, isPublic, tokenAddress);
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

      await refreshGroups();
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
      
      const tx = await contract.makeContribution(groupId);
      await tx.wait();
      
      await refreshGroups();
      toast({ title: "Success", description: "Contribution successful!" });
    } catch (err) {
      console.error("Failed to contribute:", err);
      setError(`Failed to contribute: ${err instanceof Error ? err.message : String(err)}`);
      toast({ title: "Error", description: `Failed to contribute: ${err instanceof Error ? err.message : String(err)}` });
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
      // Fetch members via contract method
      const members: string[] = await contract.getGroupMembers(groupId);
      
      return members.map((address: string, index: number) => ({
        address,
        contributionAmount: '0', // Would need to query individual contributions
        joinDate: new Date().toISOString(),
        hasContributed: false, // Would need to check contribution status
        payoutPosition: index
      }));
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

  // Function to fetch all thrift groups
  const refreshGroups = async () => {
    if (!contract || !isConnected || !account) {
      setUserGroups([]);
      setAllGroups([]);
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
          // Parallel fetch
          const [info, members, payoutOrder, isMember] = await Promise.all([
            contract.getGroupInfo(groupId),
            contract.getGroupMembers(groupId),
            contract.getPayoutOrder(groupId),
            account ? contract.isGroupMember(groupId, account) : Promise.resolve(false),
          ]);

          // Skip uninitialized groups (contributionAmount == 0) without using BigInt literals
          const contributionAmountStr = info?.contributionAmount?.toString?.() ?? '0';
          if (!info || contributionAmountStr === '0') continue;

          // Try to get maxMembers from thriftGroups mapping; if it fails, fallback to members.length
          let maxMembers = members?.length ?? 0;
          try {
            const tg = await contract.getThriftGroup(groupId);
            // Support both object and array returns
            maxMembers = Number((tg.maxMembers ?? tg[5] ?? maxMembers));
          } catch (_) {
            // ignore
          }

          const group: ThriftGroup = {
            id: groupId,
            name: `Group ${groupId}`,
            description: 'Thrift Group',
            depositAmount: formatUnits(info.contributionAmount ?? 0, 18),
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