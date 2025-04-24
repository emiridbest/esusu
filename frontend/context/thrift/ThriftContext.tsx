"use client";
import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { contractAddress, abi } from '@/utils/esusu';
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";

// Define the type for campaign data
export interface Campaign {
  id: number;
  name: string;
  description: string;
  contributionAmount: string;
  payoutInterval: string;
  lastPayoutBlock: string;
  totalContributions: string;
  monthlyContribution: string;
  userName: string;
  createdBy?: string;
  members?: CampaignMember[];
  isUserJoined?: boolean;
}

export interface CampaignMember {
  address: string;
  userName: string;
  contributionAmount: string;
  joinDate: string;
  withdrawalMonth?: number;
}

export interface ThriftContextType {
  userCampaigns: Campaign[];
  allCampaigns: Campaign[];
  createCampaign: (name: string, description: string, contributionAmount: string) => Promise<void>;
  joinCampaign: (campaignId: number, tokenAddress: string, userName: string) => Promise<void>;
  contribute: (campaignId: number, tokenAddress: string, amount: string) => Promise<void>;
  withdraw: (campaignId: number) => Promise<void>;
  getCampaignMembers: (campaignId: number) => Promise<CampaignMember[]>;
  generateShareLink: (campaignId: number) => string;
  loading: boolean;
  error: string | null;
  refreshCampaigns: () => Promise<void>;
}

// Celo token addresses
const CELO_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
const CUSD_TOKEN_ADDRESS = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

const ThriftContext = createContext<ThriftContextType | undefined>(undefined);

export const ThriftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userCampaigns, setUserCampaigns] = useState<Campaign[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
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
          
          // Initialize contract
          const esusuContract = new Contract(contractAddress, abi, await ethersProvider.getSigner());
          setContract(esusuContract);
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

  // Create campaign contract interaction
  const createCampaign = async (name: string, description: string, contributionAmount: string) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);
      
      const amount = parseUnits(contributionAmount, 18);
      const tx = await contract.createCampaign(name, description, amount);
      await tx.wait();
      
      await refreshCampaigns();
      toast.success("Campaign created successfully!");
    } catch (err) {
      console.error("Failed to create campaign:", err);
      setError(`Failed to create campaign: ${err instanceof Error ? err.message : String(err)}`);
      toast.error(`Failed to create campaign: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Join campaign contract interaction
  const joinCampaign = async (campaignId: number, tokenAddress: string, userName: string) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.joinCampaign(campaignId, tokenAddress, userName);
      await tx.wait();
      
      await refreshCampaigns();
      toast.success("Successfully joined the campaign!");
    } catch (err) {
      console.error("Failed to join campaign:", err);
      setError(`Failed to join campaign: ${err instanceof Error ? err.message : String(err)}`);
      toast.error(`Failed to join campaign: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Contribute to campaign contract interaction
  const contribute = async (campaignId: number, tokenAddress: string, amount: string) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);
      
      const amountInWei = parseUnits(amount, 18);
      const tx = await contract.contribute(tokenAddress, amountInWei);
      await tx.wait();
      
      await refreshCampaigns();
      toast.success("Contribution successful!");
    } catch (err) {
      console.error("Failed to contribute:", err);
      setError(`Failed to contribute: ${err instanceof Error ? err.message : String(err)}`);
      toast.error(`Failed to contribute: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Withdraw from campaign contract interaction
  const withdraw = async (campaignId: number) => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      setLoading(true);
      setError(null);
      
      const tx = await contract.withdraw(campaignId);
      await tx.wait();
      
      await refreshCampaigns();
      toast.success("Withdrawal successful!");
    } catch (err) {
      console.error("Failed to withdraw:", err);
      setError(`Failed to withdraw: ${err instanceof Error ? err.message : String(err)}`);
      toast.error(`Failed to withdraw: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to get campaign members (this would require backend support or event indexing)
  const getCampaignMembers = async (campaignId: number): Promise<CampaignMember[]> => {
    if (!contract || !isConnected) {
      throw new Error("Wallet not connected or contract not initialized");
    }

    try {
      // mock
      return [
        {
          address: account || '',
          userName: 'You',
          contributionAmount: '100',
          joinDate: new Date().toISOString(),
          withdrawalMonth: 1
        }
      ];
    } catch (error) {
      console.error("Failed to fetch campaign members:", error);
      throw error;
    }
  };

  // Generate shareable link for a campaign
  const generateShareLink = (campaignId: number): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/thrift/join/${campaignId}`;
  };

  // Function to fetch all campaigns
  const refreshCampaigns = async () => {
    if (!contract || !isConnected || !account) {
      setUserCampaigns([]);
      setAllCampaigns([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get all campaign IDs
      const campaignIds = await contract.getAllCampaigns();

      if (!campaignIds || !Array.isArray(campaignIds)) {
        setUserCampaigns([]);
        setAllCampaigns([]);
        return;
      }

      // Fetch details for each campaign
      const fetchedCampaigns: Campaign[] = [];
      const userCampaignsTemp: Campaign[] = [];

      for (const id of campaignIds) {
        try {
          const details = await contract.getCampaignDetails(id);

          if (!details) continue;

          // Extract campaign details from the returned array
          const [
            name,
            description,
            contributionAmount,
            payoutInterval,
            lastPayoutBlock,
            totalContributions,
            userName,
            campaignId
          ] = details;

          // Get campaign creator address
          //const creatorAddress = await contract.getCampaignCreator(id);
         // const isCreatedByUser = creatorAddress.toLowerCase() === account.toLowerCase();

          // Check if current user has joined this campaign
          const isUserJoined = userName && userName.length > 0;

          const campaign: Campaign = {
            id: Number(campaignId),
            name,
            description,
            contributionAmount: formatUnits(contributionAmount, 18),
            payoutInterval: payoutInterval.toString(),
            lastPayoutBlock: lastPayoutBlock.toString(),
            totalContributions: totalContributions.toString(),
            monthlyContribution: '0', // Placeholder, update based on contract
            userName,
            //createdBy: creatorAddress,
            isUserJoined
          };

          fetchedCampaigns.push(campaign);
          
          // If user has joined this campaign or created it, add to user campaigns
          if (isUserJoined) {
            userCampaignsTemp.push(campaign);
          }
        } catch (err) {
          console.error(`Error fetching campaign ${id}:`, err);
        }
      }

      setAllCampaigns(fetchedCampaigns);
      setUserCampaigns(userCampaignsTemp);
    } catch (err) {
      setError(`Failed to fetch campaigns: ${err instanceof Error ? err.message : String(err)}`);
      console.error(err);
      setUserCampaigns([]);
      setAllCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch of campaigns when the user connects
  useEffect(() => {
    if (isConnected && contract) {
      refreshCampaigns();
    } else {
      setUserCampaigns([]);
      setAllCampaigns([]);
    }
  }, [isConnected, contract]);

  const value = {
    userCampaigns,
    allCampaigns,
    createCampaign,
    joinCampaign,
    contribute,
    withdraw,
    getCampaignMembers,
    generateShareLink,
    loading,
    error,
    refreshCampaigns
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