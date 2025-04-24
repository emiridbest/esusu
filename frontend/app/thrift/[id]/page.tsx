"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useThrift, Campaign, CampaignMember } from '@/context/thrift/ThriftContext';
import { useAccount } from 'wagmi';
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
import { ArrowUpIcon, ArrowDownIcon, Share2Icon, UsersIcon, CalendarIcon, ArrowLeftIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function CampaignDetailsPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const isJoinRequest = searchParams.get('join') === 'true';
  const router = useRouter();
  const campaignId = typeof id === 'string' ? parseInt(id) : -1;
  
  const { userCampaigns, allCampaigns, joinCampaign, contribute, withdraw, getCampaignMembers, generateShareLink, loading, error } = useThrift();
  const { isConnected, address } = useAccount();
  const { toast } = useToast();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isUserMember, setIsUserMember] = useState(false);
  const [campaignMembers, setCampaignMembers] = useState<CampaignMember[]>([]);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [contributeDialogOpen, setContributeDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [shareableLink, setShareableLink] = useState('');
  
  // Find the campaign in user campaigns or all campaigns
  useEffect(() => {
    if (campaignId === -1) return;
    
    // First try to find in user campaigns
    let foundCampaign = userCampaigns.find(c => c.id === campaignId);
    if (foundCampaign) {
      setCampaign(foundCampaign);
      setIsUserMember(true);
      return;
    }
    
    // If not found in user campaigns, check all campaigns
    // In a real application, you might need to fetch this specific campaign if it's not in the user's list
    foundCampaign = allCampaigns.find(c => c.id === campaignId);
    if (foundCampaign) {
      setCampaign(foundCampaign);
      return;
    }
    
    // If we still don't have a campaign and the user is connected, we might need to fetch it
    // This would require an additional API endpoint or contract call to get a specific campaign by ID
  }, [campaignId, userCampaigns, allCampaigns]);
  
  // Load campaign members
  useEffect(() => {
    const loadMembers = async () => {
      if (!campaign) return;
      
      try {
        const members = await getCampaignMembers(campaign.id);
        setCampaignMembers(members);
      } catch (error) {
        console.error("Failed to fetch members:", error);
      }
    };
    
    loadMembers();
  }, [campaign]);
  
  // Open join dialog if join=true in URL and not already a member
  useEffect(() => {
    if (isJoinRequest && !isUserMember && campaign && !joinDialogOpen) {
      setJoinDialogOpen(true);
    }
  }, [isJoinRequest, isUserMember, campaign, joinDialogOpen]);
  
  const handleJoinClick = () => {
    setJoinDialogOpen(true);
  };
  
  const handleContributeClick = () => {
    if (!campaign) return;
    setContributionAmount(campaign.contributionAmount);
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
    if (!campaign || !userName) return;
    
    try {
      // Default to cUSD
      const tokenAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";
      await joinCampaign(campaign.id, tokenAddress, userName);
      setJoinDialogOpen(false);
      setUserName('');
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
    if (!campaign || !contributionAmount) return;
    
    try {
      // Default to cUSD
      const tokenAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";
      await contribute(campaign.id, tokenAddress, contributionAmount);
      setContributeDialogOpen(false);
      setContributionAmount('');
      
      toast({
        title: "Contribution successful",
        description: `You've contributed ${contributionAmount} cUSD to the thrift group.`,
      });
    } catch (error) {
      console.error("Failed to contribute:", error);
      toast({
        title: "Contribution failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  const handleWithdraw = async () => {
    if (!campaign) return;
    
    try {
      await withdraw(campaign.id);
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
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="text-center">
          <p>Loading thrift group details...</p>
        </div>
      </div>
    );
  }
  
  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Thrift Group Not Found</h1>
          <p className="mb-6">The thrift group you are looking for does not exist or you don't have access to it.</p>
          <Button onClick={() => router.push('/thrift')} className="flex items-center gap-2">
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Thrift Groups
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-10">
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
      
      <Card className="overflow-hidden border-primary/20 mb-8">
        <CardHeader className="bg-primary/5 pb-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl font-bold">{campaign.name}</CardTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {parseFloat(campaign.contributionAmount)} cUSD / month
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {campaign.description}
          </p>
          
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="contributions">Contributions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Monthly Contribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{campaign.contributionAmount} cUSD</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Total Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{campaign.totalContributions || '0'}/5</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Rotation Period</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">30 days</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Rotation Progress</h3>
                <div className="flex justify-between text-sm mb-1">
                  <span>Current Rotation</span>
                  <span>53%</span>
                </div>
                <Progress value={53} className="h-2 mb-4" />
                <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <UsersIcon className="h-4 w-4" />
                    <span>Current recipient: {campaignMembers.length > 0 ? campaignMembers[0].userName : 'Pending'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Next rotation: {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-primary/5 rounded-lg p-4 text-sm">
                <h3 className="font-medium mb-2">How This Thrift Group Works</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Each member contributes <strong>{campaign.contributionAmount} cUSD</strong> monthly</li>
                  <li>The total pool is distributed to one member each month</li>
                  <li>Order is determined when you join the group</li>
                  <li>Everyone gets a turn to receive the full pool amount</li>
                  <li>Missing a contribution may result in losing your turn</li>
                </ul>
              </div>
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
                      <TableHead className="text-right">Withdrawal Month</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignMembers.length > 0 ? (
                      campaignMembers.map((member, index) => (
                        <TableRow key={index}>
                          <TableCell>{member.userName}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {member.address.substring(0, 6)}...{member.address.substring(member.address.length - 4)}
                          </TableCell>
                          <TableCell>{new Date(member.joinDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">{member.withdrawalMonth || 'Pending'}</TableCell>
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
                    {campaignMembers.length > 0 ? (
                      <TableRow>
                        <TableCell>{new Date().toLocaleDateString()}</TableCell>
                        <TableCell>{campaignMembers[0].userName}</TableCell>
                        <TableCell className="text-right">{campaign.contributionAmount} cUSD</TableCell>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4">
                          No contributions yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t pt-4 flex flex-wrap gap-2">
          {isUserMember ? (
            <>
              <Button
                variant="outline"
                className="flex items-center gap-1"
                onClick={handleContributeClick}
              >
                <ArrowUpIcon className="h-4 w-4" />
                Contribute
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-1"
                onClick={handleWithdrawClick}
                disabled={true} // Disabled until it's the user's turn
              >
                <ArrowDownIcon className="h-4 w-4" />
                Withdraw
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-1"
                onClick={handleShareClick}
              >
                <Share2Icon className="h-4 w-4" />
                Share
              </Button>
            </>
          ) : (
            <Button
              className="flex items-center gap-1"
              onClick={handleJoinClick}
              disabled={!isConnected}
            >
              <UsersIcon className="h-4 w-4" />
              {isConnected ? 'Request to Join' : 'Connect Wallet to Join'}
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Join Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Join Thrift Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">You're requesting to join: <strong>{campaign.name}</strong></p>
            <p className="text-sm text-gray-500 mb-6">
              Monthly contribution: {campaign.contributionAmount} cUSD
            </p>
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="userName" className="text-right">Your Name</Label>
                <Input 
                  id="userName" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="col-span-3" 
                  placeholder="Enter your name" 
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                <p>Your request will be reviewed by the group creator before you can join.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setJoinDialogOpen(false);
              // Remove join param from URL
              if (isJoinRequest) {
                router.replace(`/thrift/${campaignId}`);
              }
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleJoinCampaign}
              disabled={loading || !userName || !isConnected}
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
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributeDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleContribute}
              disabled={loading || !contributionAmount}
            >
              {loading ? 'Processing...' : 'Contribute'}
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
              {parseFloat(campaign.contributionAmount) * 5} cUSD
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
                Anyone with this link can request to join your thrift group. You'll need to approve their request.
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
    </div>
  );
}