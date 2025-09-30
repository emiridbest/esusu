"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useThrift, ThriftGroup, ThriftMember } from '@/context/thrift/ThriftContext';
import { useActiveAccount } from 'thirdweb/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ArrowUpIcon, ArrowDownIcon, Share2Icon, UsersIcon, CalendarIcon, ArrowLeftIcon, SparklesIcon, Settings, Play, DollarSign, AlertTriangle, RotateCcw, GripVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import EditMetadataDialog from '@/components/thrift/EditMetadataDialog';
import CountdownTimer from '@/components/thrift/CountdownTimer';
import { contractAddress } from '@/utils/abi';
import { cn } from '@/lib/utils';

export default function CampaignDetailsPage() {
  const params = useParams();
  const id = params?.id;
  const searchParams = useSearchParams();
  const isJoinRequest = searchParams?.get('join') === 'true';
  const router = useRouter();
  const campaignId = typeof id === 'string' ? parseInt(id) : -1;
  
  const { userGroups, allGroups, joinThriftGroup, checkJoinStatus, checkGroupStatus, makeContribution, distributePayout, getThriftGroupMembers, getContributionHistory, generateShareLink, activateThriftGroup, setPayoutOrder, emergencyWithdraw, refreshGroups, loading, error } = useThrift();
  const account = useActiveAccount();
  const address = account?.address;
  const isConnected = !!address;
  const { toast } = useToast();
  
  const [campaign, setCampaign] = useState<ThriftGroup | null>(null);
  const [isUserMember, setIsUserMember] = useState(false);
  const [campaignMembers, setCampaignMembers] = useState<ThriftMember[]>([]);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [contributeDialogOpen, setContributeDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [shareableLink, setShareableLink] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [metaCreatedBy, setMetaCreatedBy] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any | null>(null);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [payoutOrder, setPayoutOrderInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [memberOrder, setMemberOrder] = useState<string[]>([]);
  const [joinStatus, setJoinStatus] = useState<{
    isMember: boolean;
    canJoin: boolean;
    reason?: string;
  }>({ isMember: false, canJoin: false });
  const [joinUserName, setJoinUserName] = useState('');
  const [groupStatus, setGroupStatus] = useState<{
    exists: boolean;
    isActive: boolean;
    isStarted: boolean;
    canContribute: boolean;
    reason?: string;
    startDate: Date | null;
    timeUntilStart: number | null;
  } | null>(null);
  
  const [contributionHistory, setContributionHistory] = useState<Array<{
    date: Date;
    member: string;
    memberName: string;
    amount: string;
    tokenSymbol: string;
    transactionHash: string;
  }>>([]);
  
  // Find the campaign in user campaigns or all campaigns
  useEffect(() => {
    if (campaignId === -1) return;
    
    // First try to find in user campaigns
    let foundCampaign = userGroups.find((c: ThriftGroup) => c.id === campaignId);
    if (foundCampaign) {
      setCampaign(foundCampaign);
      setIsUserMember(true);
      return;
    }
    
    // If not in user groups, check all groups
    foundCampaign = allGroups.find((c: ThriftGroup) => c.id === campaignId);
    if (foundCampaign) {
      setCampaign(foundCampaign);
      // Don't set isUserMember here - let the status check determine it
      return;
    }

  }, [campaignId, userGroups, allGroups]);
  
  // Load campaign members
  useEffect(() => {
    const loadMembers = async () => {
      if (!campaign) return;
      
      try {
        const members = await getThriftGroupMembers(campaign.id);
        setCampaignMembers(members);
        // Initialize member order with current member addresses
        const addresses = members.map(member => member.address);
        setMemberOrder(addresses);
      } catch (error) {
        console.error("Failed to fetch members:", error);
      }
    };
    
    loadMembers();
  }, [campaign, getThriftGroupMembers]);

  // Load metadata for creator (permissions) and history view
  useEffect(() => {
    const loadMetadata = async () => {
      if (!campaign) return;
      try {
        const res = await fetch(`/api/thrift/metadata?contract=${contractAddress}&ids=${campaign.id}`);
        if (res.ok) {
          const data = await res.json();
          const doc = Array.isArray(data?.items) ? data.items.find((it: any) => Number(it.groupId) === campaign.id) : null;
          setMetaCreatedBy(doc?.createdBy ? String(doc.createdBy).toLowerCase() : null);
          setMetadata(doc || null);
        }
      } catch (e) {
        console.warn('Failed to load thrift metadata:', e);
      }
    };
    loadMetadata();
  }, [campaign]);
  
  // Check join status when campaign or address changes
  useEffect(() => {
    const checkStatus = async () => {
      if (campaign && address) {
        try {
          const status = await checkJoinStatus(campaign.id);
          setJoinStatus(status);
          setIsUserMember(status.isMember);
        } catch (error) {
          console.error('Failed to check join status:', error);
        }
      }
    };
    checkStatus();
  }, [campaign, address, checkJoinStatus]);

  // Test checkGroupStatus function availability and check group status
  useEffect(() => {
    const checkStatus = async () => {
      if (campaign) {
        console.log('checkGroupStatus function available:', typeof checkGroupStatus);
        console.log('Campaign ID:', campaign.id);
        
        try {
          const status = await checkGroupStatus(campaign.id);
          setGroupStatus(status);
          console.log('Group status updated:', status);
        } catch (error) {
          console.error('Failed to check group status:', error);
        }
      }
    };
    
    checkStatus();
  }, [campaign, checkGroupStatus]);

  // Effect to fetch contribution history
  useEffect(() => {
    const fetchContributionHistory = async () => {
      if (campaign && groupStatus?.isStarted) {
        try {
          console.log('Fetching contribution history for group:', campaign.id);
          const history = await getContributionHistory(campaign.id);
          setContributionHistory(history);
          console.log('Contribution history updated:', history);
        } catch (error) {
          console.error('Failed to fetch contribution history:', error);
          // Show user-friendly message for RPC errors
          if (error instanceof Error && error.message.includes('RPC')) {
            toast({
              title: "Network Issue",
              description: "Unable to fetch contribution history due to network connectivity. Please try again later.",
              variant: "destructive",
            });
          }
          setContributionHistory([]);
        }
      } else {
        setContributionHistory([]);
      }
    };
    
    fetchContributionHistory();
  }, [campaign, groupStatus?.isStarted, getContributionHistory, toast]);

  // Open join dialog if join=true in URL and not already a member
  useEffect(() => {
    if (isJoinRequest && !isUserMember && campaign && !joinDialogOpen) {
      setJoinDialogOpen(true);
    }
  }, [isJoinRequest, isUserMember, campaign, joinDialogOpen]);

  // Check if user is group admin
  useEffect(() => {
    const checkGroupAdmin = async () => {
      if (!campaign || !address) {
        console.log('Admin check: No campaign or address');
        setIsGroupAdmin(false);
        return;
      }

      try {
        console.log('Checking admin status for group:', campaign.id, 'address:', address);
        
        // Import the contract to check admin status
        const { ethers } = await import('ethers');
        const { contractAddress, abi } = await import('@/utils/abi');
        
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          console.log('Admin check: No ethereum provider');
          return;
        }
        
        const provider = new ethers.BrowserProvider(ethereum);
        const contract = new ethers.Contract(contractAddress, abi, provider);
        
        const groupInfo = await contract.thriftGroups(campaign.id);
        const groupAdmin = groupInfo.admin;
        
        console.log('Group admin from contract:', groupAdmin);
        console.log('Current user address:', address);
        
        const isAdmin = groupAdmin && groupAdmin.toLowerCase() === address.toLowerCase();
        console.log('Is group admin:', isAdmin);
        
        setIsGroupAdmin(isAdmin);
      } catch (error) {
        console.error('Failed to check group admin status:', error);
        
        // Fallback: Check if user is the creator based on metadata
        if (metaCreatedBy && address && address.toLowerCase() === metaCreatedBy.toLowerCase()) {
          console.log('Using fallback admin check - user is creator');
          setIsGroupAdmin(true);
        } else {
          setIsGroupAdmin(false);
        }
      }
    };

    checkGroupAdmin();
  }, [campaign, address]);
  
  const handleJoinClick = () => {
    setJoinDialogOpen(true);
  };
  
  const handleContributeClick = () => {
    console.log('Main contribute button clicked!');
    if (!campaign) {
      console.log('No campaign available');
      return;
    }
    console.log('Setting contribution amount to:', campaign.depositAmount);
    setContributionAmount(campaign.depositAmount);
    setContributeDialogOpen(true);
  };
  
  const handleWithdrawClick = () => {
    setWithdrawDialogOpen(true);
  };
  
  const handleShareClick = () => {
    if (!campaign) return;
    setShareableLink(generateShareLink(campaign.id));
    setShareDialogOpen(true);
  };
  
  const handleJoinCampaign = async () => {
    if (!campaign) return;
    
    try {
      await joinThriftGroup(campaign.id, joinUserName);
      setJoinDialogOpen(false);
      setIsUserMember(true);
      
      toast({
        title: "Join request sent",
        description: "Your request to join this thrift group has been submitted.",
      });
      
      // Clear the join param from URL
      router.replace(`/thrift/${campaignId}`);
    } catch (error) {
      console.error("Failed to join campaign:", error);
      toast({
        title: "Join request failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  const handleContribute = async () => {
    if (!campaign) {
      console.log('Contribute: No campaign');
      return;
    }
    
    console.log('Contributing to group:', campaign.id);
    console.log('Group is active:', campaign.isActive);
    console.log('Campaign details:', {
      id: campaign.id,
      isActive: campaign.isActive,
      totalMembers: campaign.totalMembers,
      maxMembers: campaign.maxMembers,
      depositAmount: campaign.depositAmount,
      tokenSymbol: campaign.tokenSymbol
    });
    console.log('User membership status:', {
      isUserMember,
      address,
      campaignMembers: campaign.members
    });
    
    // Check if group is active before attempting contribution
    if (!campaign.isActive) {
      console.log('Group is not active, showing error');
      toast({
        title: "Group not active",
        description: "This group is not active yet. Contributions will be available when the group starts. Please wait for the admin to activate the group.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log('Calling makeContribution...');
      await makeContribution(campaign.id);
      console.log('Contribution successful');
      
      setContributeDialogOpen(false);
      setContributionAmount('');
      
      toast({
        title: "Contribution successful",
        description: `You've contributed to the thrift group.`,
      });
    } catch (error) {
      console.error('Contribution error:', error);
      
      // Handle specific error cases with graceful notifications
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        if (error.message.includes("Group has not started yet")) {
          errorMessage = "This group has not started yet. Please wait for the admin to activate the group before contributing.";
        } else if (error.message.includes("Group is not active")) {
          errorMessage = "This group is not active yet. Please wait for the admin to activate the group before contributing.";
        } else if (error.message.includes("execution reverted")) {
          errorMessage = "Unable to contribute at this time. Please check that the group is active and try again.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds. Please ensure you have enough tokens to make the contribution.";
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was cancelled by user.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Contribution failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  const handleWithdraw = async () => {
    if (!campaign) return;
    
    try {
      await distributePayout(campaign.id);
      setWithdrawDialogOpen(false);
      
      toast({
        title: "Withdrawal successful",
        description: "You've successfully withdrawn funds from the thrift group.",
      });
    } catch (error) {
      console.error("Failed to withdraw:", error);
      toast({
        title: "Withdrawal failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableLink)
      .then(() => {
        toast({
          title: "Link copied!",
          description: "Share with your friends to join this thrift group",
        });
        setShareDialogOpen(false);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  // Admin action handlers
  const handleActivateGroup = async () => {
    if (!campaign) {
      console.log('Activate: No campaign');
      return;
    }
    
    console.log('Activating group:', campaign.id);
    setIsProcessing(true);
    
    try {
      console.log('Calling activateThriftGroup...');
      await activateThriftGroup(campaign.id);
      console.log('Group activated successfully');
      
      toast({
        title: "Group activated",
        description: "The thrift group has been activated successfully.",
      });
    } catch (error) {
      console.error('Activation error:', error);
      
      // Handle specific error cases with graceful notifications
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        if (error.message.includes("Payout order not set")) {
          errorMessage = "Please set the payout order before activating the group. Use the 'Set Payout Order' button to arrange members in the desired payment sequence.";
        } else if (error.message.includes("Group is not active")) {
          errorMessage = "This group is already active or cannot be activated at this time.";
        } else if (error.message.includes("execution reverted")) {
          errorMessage = "Unable to activate group. Please check that all requirements are met and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Activation failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetPayoutOrder = async () => {
    if (!campaign || memberOrder.length === 0) {
      toast({
        title: "Invalid payout order",
        description: "Please arrange the member order.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      await setPayoutOrder(campaign.id, memberOrder);
      setAdminDialogOpen(false);
      toast({
        title: "Payout order set",
        description: "The payout order has been set successfully.",
      });
    } catch (error) {
      console.error("Failed to set payout order:", error);
      toast({
        title: "Failed to set payout order",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to move member up in order
  const moveMemberUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...memberOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setMemberOrder(newOrder);
  };

  // Function to move member down in order
  const moveMemberDown = (index: number) => {
    if (index === memberOrder.length - 1) return;
    const newOrder = [...memberOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setMemberOrder(newOrder);
  };

  const handleEmergencyWithdraw = async () => {
    if (!campaign) return;
    
    if (!confirm('Are you sure you want to perform emergency withdrawal? This action cannot be undone.')) {
      return;
    }
    
    setIsProcessing(true);
    try {
      await emergencyWithdraw(campaign.id);
      toast({
        title: "Emergency withdrawal executed",
        description: "Emergency withdrawal has been executed successfully.",
      });
    } catch (error) {
      console.error("Failed to execute emergency withdrawal:", error);
      toast({
        title: "Emergency withdrawal failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center min-h-[400px]"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading thrift group details...</p>
        </div>
      </motion.div>
    );
  }
  
  if (!campaign) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center min-h-[400px]"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Thrift Group Not Found</h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">The thrift group you are looking for does not exist or you do not have access to it.</p>
          <Button onClick={() => router.push('/thrift')} className="flex items-center gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Thrift Groups
          </Button>
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => router.push('/thrift')}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Thrift Groups
          </Button>
        </div>
      
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <CardTitle>
                  {campaign.name}
                </CardTitle>
                {address && metaCreatedBy && address.toLowerCase() === metaCreatedBy && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setEditOpen(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
              <Badge variant="secondary">
                {parseFloat(campaign.depositAmount)} {campaign.tokenSymbol || 'cUSD'} / month
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {campaign.description}
            </p>
          </CardHeader>
        <CardContent>
          
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-4 gap-1">
              <TabsTrigger value="overview" className="w-full">
                Overview
              </TabsTrigger>
              <TabsTrigger value="members" className="w-full">
                Members
              </TabsTrigger>
              <TabsTrigger value="contributions" className="w-full">
                Contributions
              </TabsTrigger>
              <TabsTrigger value="history" className="w-full">
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Monthly Contribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{campaign.depositAmount} {campaign.tokenSymbol || 'cUSD'}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{campaign.totalMembers}/{campaign.maxMembers}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Rotation Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">30 days</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>
                    {groupStatus?.isStarted ? 'Rotation Progress' : 'Group Status'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {groupStatus?.isStarted ? (
                    // Show rotation progress when group has started
                    <>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Current Rotation</span>
                        <span className="font-bold">
                          {campaign.isActive 
                            ? (campaign.currentRound === 0 ? "Round 1" : `Round ${campaign.currentRound + 1}`)
                            : "Not Started"
                          }
                        </span>
                      </div>
                      <Progress value={campaign.currentRound * 20} className="h-2 mb-4" />
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <UsersIcon className="h-4 w-4" />
                          <span>Past recipient: {campaign.pastRecipient ? `${campaign.pastRecipient.substring(0, 6)}...${campaign.pastRecipient.substring(campaign.pastRecipient.length - 4)}` : 'None'}</span>
                        </div>
                        {campaign.isActive && (
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            <span>Next rotation: {campaign.nextPaymentDate ? campaign.nextPaymentDate.toLocaleDateString() : 'TBD'}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : groupStatus?.startDate ? (
                    // Show countdown timer when group hasn't started but has a start date
                    <CountdownTimer 
                      targetDate={groupStatus.startDate}
                      onComplete={() => {
                        // Refresh group status when countdown completes
                        if (campaign) {
                          checkGroupStatus(campaign.id).then(setGroupStatus);
                        }
                      }}
                    />
                  ) : (
                    // Show waiting message when group is not active
                    <div className="text-center py-8">
                      <div className="text-lg font-semibold text-gray-700 mb-2">
                        {groupStatus?.isActive ? 'Group Activated' : 'Group Not Active'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {groupStatus?.isActive 
                          ? 'Waiting for start date...' 
                          : 'This group has not been activated yet. Please wait for the admin to activate the group.'
                        }
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>How This Thrift Group Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    <li>Each member contributes <strong>{campaign.depositAmount} {campaign.tokenSymbol || 'cUSD'}</strong> monthly</li>
                    <li>The total pool is distributed to one member each month</li>
                    <li>Order is determined when you join the group</li>
                    <li>Everyone gets a turn to receive the full pool amount</li>
                    <li>Missing a contribution may result in losing your turn</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="members">
              <h3 className="text-lg font-medium mb-4">Group Members</h3>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead className="text-right">Payout Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignMembers.length > 0 ? (
                      campaignMembers.map((member, index) => (
                        <TableRow key={index}>
                          <TableCell>{member.userName || `Member ${index + 1}`}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {member.address.substring(0, 6)}...{member.address.substring(member.address.length - 4)}
                          </TableCell>
                          <TableCell>{new Date(member.joinDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">{member.payoutPosition !== undefined ? member.payoutPosition + 1 : index + 1}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          No members yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="contributions">
              <h3 className="text-lg font-medium mb-4">Contribution History</h3>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!groupStatus?.isStarted ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4">
                          <div className="text-gray-500">
                            <p className="font-medium">Group has not started yet</p>
                            <p className="text-sm">Contributions will appear here once the group becomes active</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : contributionHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4">
                          <div className="text-gray-500">
                            <p className="font-medium">No contributions yet</p>
                            <p className="text-sm">Contributions will appear here as members make payments</p>
                            <div className="flex gap-2 mt-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={async () => {
                                  if (campaign) {
                                    console.log('Refresh History clicked for group:', campaign.id);
                                    try {
                                      const history = await getContributionHistory(campaign.id);
                                      console.log('Refresh result:', history);
                                      setContributionHistory(history);
                                      if (history.length === 0) {
                                        toast({
                                          title: "No Contributions Found",
                                          description: "No contribution events found on the blockchain for this group.",
                                          variant: "destructive",
                                        });
                                      } else {
                                        toast({
                                          title: "History Refreshed",
                                          description: `Found ${history.length} contribution(s).`,
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Refresh failed:', error);
                                      toast({
                                        title: "Refresh Failed",
                                        description: "Failed to fetch contribution history. Please try again.",
                                        variant: "destructive",
                                      });
                                    }
                                  }
                                }}
                              >
                                Refresh History
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  if (campaign) {
                                    console.log('Debug: Testing contribution history for group:', campaign.id);
                                    console.log('Current group status:', groupStatus);
                                    console.log('Current contribution history:', contributionHistory);
                                    console.log('Contract available:', !!contract);
                                    console.log('Is connected:', isConnected);
                                  }
                                }}
                              >
                                Debug
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      contributionHistory.map((contribution, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {contribution.date.toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{contribution.memberName}</span>
                              <span className="text-xs text-gray-500 font-mono">
                                {contribution.member.substring(0, 6)}...{contribution.member.substring(contribution.member.length - 4)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {contribution.amount} {contribution.tokenSymbol}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <h3 className="text-lg font-medium mb-4">Metadata History</h3>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metadata?.updateLog && metadata.updateLog.length > 0 ? (
                      [...metadata.updateLog].reverse().map((entry: any, idx: number) => {
                        const when = entry?.at ? new Date(entry.at) : null;
                        const by = entry?.by || '';
                        const changes = entry?.changes || {};
                        const fields = Object.keys(changes).filter((k) => changes[k] !== undefined);
                        return (
                          <TableRow key={idx}>
                            <TableCell className="whitespace-nowrap">{when ? when.toLocaleString() : '-'}</TableCell>
                            <TableCell className="font-mono text-xs">{by ? `${by.substring(0,6)}...${by.substring(by.length-4)}` : '-'}</TableCell>
                            <TableCell>
                              {fields.length > 0 ? (
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {fields.map((f) => (
                                    <span key={f} className="inline-flex items-center rounded border px-2 py-0.5 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-neutral-500">No field changes recorded</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4">No history yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

          </Tabs>
        </CardContent>

        <CardFooter>
          {isUserMember ? (
            <>
              <Button
                className="w-full"
                onClick={() => {
                  console.log('Main contribute button clicked!');
                  handleContributeClick();
                }}
                disabled={!campaign || !campaign.isActive}
              >
                <ArrowUpIcon className="h-4 w-4 mr-2" />
                {!campaign.isActive ? 'Group Not Active' : 'Contribute'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleWithdrawClick}
                disabled={true}
              >
                <ArrowDownIcon className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleShareClick}
              >
                <Share2Icon className="h-4 w-4 mr-2" />
                Share
              </Button>
            </>
          ) : (
            <Button
              className="w-full"
              onClick={handleJoinClick}
              disabled={!isConnected || !joinStatus.canJoin}
            >
              <UsersIcon className="h-4 w-4 mr-2" />
              {!isConnected 
                ? 'Connect Wallet to Join' 
                : !joinStatus.canJoin 
                  ? `Cannot Join - ${joinStatus.reason || 'Unknown reason'}`
                  : 'Request to Join'
              }
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Admin Controls - Only show if user is group admin */}
      {isGroupAdmin && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Group Admin Controls
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              You are the admin of this group. Admin controls are available below.
            </p>
    <div className="text-xs text-gray-500 mt-2">
      Debug: isGroupAdmin={isGroupAdmin.toString()}, campaign.isActive={campaign.isActive?.toString()}, isProcessing={isProcessing.toString()}
    </div>
          </CardHeader>
          <CardContent>
            {/* Group Status Debug */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Group Status Check</h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    console.log('Test button clicked!');
                    alert('Button click works!');
                  }}
                >
                  Test Button
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    console.log('Check Group Status button clicked!');
                    if (campaign) {
                      console.log('Campaign found:', campaign.id);
                      try {
                        console.log('Calling checkGroupStatus...');
                        const status = await checkGroupStatus(campaign.id);
                        console.log('Group Status result:', status);
                        toast({
                          title: "Group Status",
                          description: `Exists: ${status.exists}, Active: ${status.isActive}, Started: ${status.isStarted}, Can Contribute: ${status.canContribute}${status.reason ? ` - ${status.reason}` : ''}`,
                        });
                      } catch (error) {
                        console.error('Failed to check group status:', error);
                        toast({
                          title: "Error",
                          description: "Failed to check group status",
                          variant: "destructive"
                        });
                      }
                    } else {
                      console.log('No campaign found');
                      toast({
                        title: "Error",
                        description: "No campaign found",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  Check Group Status
                </Button>
              </div>
            </div>
            
            <div className="grid gap-4">
              {/* Activate Group */}
              {!campaign.isActive && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Activate Group</h3>
                    <p className="text-sm text-muted-foreground">
                      Start the thrift group to allow contributions
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      console.log('Activate button clicked!');
                      handleActivateGroup();
                    }}
                    disabled={isProcessing}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isProcessing ? 'Activating...' : 'Activate'}
                  </Button>
                </div>
              )}

              {/* Set Payout Order */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Set Payout Order</h3>
                  <p className="text-sm text-muted-foreground">
                    Define the order members will receive payouts
                  </p>
                </div>
                <Button
                  onClick={() => setAdminDialogOpen(true)}
                  variant="outline"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Set Order
                </Button>
              </div>

              {/* Distribute Payout */}
              {campaign.isActive && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Distribute Payout</h3>
                    <p className="text-sm text-muted-foreground">
                      Distribute payout to current recipient
                    </p>
                  </div>
                  <Button
                    onClick={() => distributePayout(campaign.id)}
                    disabled={isProcessing}
                    variant="outline"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Distribute
                  </Button>
                </div>
              )}

              {/* Debug Refresh Button */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                <div>
                  <h3 className="font-medium text-yellow-800">Debug: Manual Refresh</h3>
                  <p className="text-sm text-yellow-600">
                    Manually refresh group state to check for updates
                  </p>
                </div>
                <Button
                  onClick={async () => {
                    console.log('Manual refresh clicked for group:', campaign.id);
                    try {
                      // Force refresh the groups
                      await refreshGroups();
                      // Also check group status
                      const status = await checkGroupStatus(campaign.id);
                      console.log('Manual refresh - Group status:', status);
                      toast({
                        title: "Manual Refresh Complete",
                        description: `Group status: Round ${status.currentRound || 'Unknown'}, Active: ${status.isActive}`,
                      });
                    } catch (error) {
                      console.error('Manual refresh failed:', error);
                      toast({
                        title: "Refresh Failed",
                        description: "Failed to refresh group state",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={isProcessing}
                  variant="outline"
                  className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Refresh State
                </Button>
              </div>

              {/* Emergency Withdraw */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Emergency Withdraw</h3>
                  <p className="text-sm text-muted-foreground">
                    Emergency withdrawal for critical situations
                  </p>
                </div>
                <Button
                  onClick={handleEmergencyWithdraw}
                  disabled={isProcessing}
                  variant="destructive"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Emergency
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Join Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Join Thrift Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">You are requesting to join: <strong>{campaign.name}</strong></p>
            <p className="text-sm text-gray-500 mb-6">
              Monthly contribution: {campaign.depositAmount} {campaign.tokenSymbol || 'cUSD'}
            </p>
            
            {!joinStatus.canJoin && joinStatus.reason && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 mb-4">
                <p><strong>Cannot join this group:</strong> {joinStatus.reason}</p>
              </div>
            )}
            
            {joinStatus.canJoin && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                  <p>Your request will be reviewed by the group creator before you can join.</p>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="joinUserName" className="text-right">Your Name</Label>
                  <Input 
                    id="joinUserName" 
                    value={joinUserName}
                    onChange={(e) => setJoinUserName(e.target.value)}
                    className="col-span-3" 
                    placeholder="Enter your name" 
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setJoinDialogOpen(false);
              if (isJoinRequest) {
                router.replace(`/thrift/${campaignId}`);
              }
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleJoinCampaign}
              disabled={loading || !isConnected || !joinStatus.canJoin || !joinUserName.trim()}
            >
              {loading ? 'Processing...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contribute Dialog */}
      <Dialog open={contributeDialogOpen} onOpenChange={setContributeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Make Contribution</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Contributing to: <strong>{campaign.name}</strong></p>
            
            {!campaign.isActive && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 mb-4">
                <p><strong>Group Not Active:</strong> This group has not been activated yet. Please wait for the admin to activate the group before contributing.</p>
              </div>
            )}
            
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount</Label>
                <Input 
                  id="amount" 
                  type="number"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  className="col-span-3" 
                  placeholder="100" 
                  disabled={!campaign.isActive}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributeDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                console.log('Contribute button clicked!');
                handleContribute();
              }}
              disabled={loading || !campaign.isActive}
            >
              {loading ? 'Processing...' : !campaign.isActive ? 'Group Not Active' : 'Contribute'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Withdrawing from: <strong>{campaign.name}</strong></p>
            <p className="text-sm text-gray-500 mb-2">
              You are about to withdraw the full pool amount:
            </p>
            <p className="text-2xl font-bold mb-6">
              {parseFloat(campaign.depositAmount) * 5} {campaign.tokenSymbol || 'cUSD'}
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
              <p>Note: You can only withdraw once during your assigned rotation. Make sure this is the right time.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleWithdraw}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Withdraw Funds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Share Thrift Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Share <strong>{campaign.name}</strong> with your friends</p>
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="shareLink" className="text-right">Share Link</Label>
                <Input 
                  id="shareLink" 
                  value={shareableLink}
                  readOnly
                  className="col-span-3" 
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>
              <p className="text-sm text-gray-500">
                Anyone with this link can request to join your thrift group. You will need to approve their request.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={copyToClipboard}
            >
              Copy Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Dialog - Set Payout Order */}
      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Set Payout Order</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Arrange the payout order for <strong>{campaign?.name}</strong></p>
            <p className="text-sm text-muted-foreground mb-4">
              Drag members up or down to set the order they will receive payouts. The first member will receive the first payout.
            </p>
            
            <div className="space-y-2">
              {memberOrder.map((address, index) => {
                const member = campaignMembers.find(m => m.address === address);
                return (
                  <div 
                    key={address}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveMemberUp(index)}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUpIcon className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveMemberDown(index)}
                          disabled={index === memberOrder.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDownIcon className="h-3 w-3" />
                        </Button>
                      </div>
                      <div>
                        <p className="font-medium">
                          {member?.userName || `Member ${index + 1}`}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {address.substring(0, 6)}...{address.substring(address.length - 4)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {memberOrder.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <UsersIcon className="h-8 w-8 mx-auto mb-2" />
                <p>No members found. Members will appear here once they join the group.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSetPayoutOrder}
              disabled={memberOrder.length === 0 || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Set Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Metadata Dialog */}
      <EditMetadataDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contractAddress={contractAddress}
        groupId={campaign.id}
        initialName={campaign.name}
        initialDescription={campaign.description}
        initialCoverImageUrl={campaign.meta?.coverImageUrl}
        initialCategory={campaign.meta?.category}
        initialTags={campaign.meta?.tags}
        onSaved={({ name, description }) => {
          setCampaign((prev) => prev ? { ...prev, name, description: description || prev.description } : prev);
        }}
      />
    </motion.div>
  );
}