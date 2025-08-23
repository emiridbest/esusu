"use client";
import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
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
  payoutOrder: number[];
  completedPayouts: number;
  isUserMember?: boolean;
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
      const tx = await contract.createThriftGroup(name, description, amount, maxMembers, isPublic);
      await tx.wait();
      
      await refreshGroups();
      toast.success("Thrift group created successfully!");
    } catch (err) {
      console.error("Failed to create thrift group:", err);
      setError(`Failed to create thrift group: ${err instanceof Error ? err.message : String(err)}`);
      toast.error(`Failed to create thrift group: ${err instanceof Error ? err.message : String(err)}`);
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
      toast.success("Successfully joined the thrift group!");
    } catch (err) {
      console.error("Failed to join thrift group:", err);
      setError(`Failed to join thrift group: ${err instanceof Error ? err.message : String(err)}`);
      toast.error(`Failed to join thrift group: ${err instanceof Error ? err.message : String(err)}`);
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
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.makeContribution(groupId);
      await tx.wait();
      
      await refreshGroups();
      toast.success("Contribution successful!");
    } catch (err) {
      console.error("Failed to contribute:", err);
      setError(`Failed to contribute: ${err instanceof Error ? err.message : String(err)}`);
      toast.error(`Failed to contribute: ${err instanceof Error ? err.message : String(err)}`);
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
      // Get group data to access members array
      const groupData = await contract.getThriftGroup(groupId);
      const members = groupData.members || [];
      
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

      // Get user's groups first
      const userGroupIds = await contract.getUserGroups(account);
      const fetchedGroups: ThriftGroup[] = [];
      const userGroupsTemp: ThriftGroup[] = [];

      // For demo purposes, we'll create some mock groups
      // In production, you would iterate through actual group IDs from events or contract state
      const mockGroupIds = [1, 2, 3];
      
      for (const groupId of mockGroupIds) {
        try {
          const groupData = await contract.getThriftGroup(groupId);
          
          if (!groupData) continue;

          // Parse group data structure based on contract ABI
          const group: ThriftGroup = {
            id: groupId,
            name: groupData.name || `Group ${groupId}`,
            description: groupData.description || 'Thrift Group',
            depositAmount: formatUnits(groupData.depositAmount || '0', 18),
            maxMembers: Number(groupData.maxMembers || 5),
            isPublic: Boolean(groupData.isPublic),
            isActive: Boolean(groupData.isActive),
            currentRound: Number(groupData.currentRound || 0),
            totalMembers: Number(groupData.totalMembers || 0),
            members: groupData.members || [],
            contributions: groupData.contributions || {},
            payoutOrder: groupData.payoutOrder || [],
            completedPayouts: Number(groupData.completedPayouts || 0),
            isUserMember: userGroupIds.includes(groupId)
          };

          fetchedGroups.push(group);
          
          // If user is a member, add to user groups
          if (group.isUserMember) {
            userGroupsTemp.push(group);
          }
        } catch (err) {
          console.error(`Error fetching group ${groupId}:`, err);
        }
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