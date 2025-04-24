"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Campaign, useThrift } from '@/context/thrift/ThriftContext';
import { UsersIcon, CalendarIcon, Share2Icon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export function CampaignList() {
  const { userCampaigns, joinCampaign, generateShareLink, loading, error } = useThrift();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [shareableLink, setShareableLink] = useState('');

  // Check if wallet is connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          setConnected(accounts && accounts.length > 0);
        } catch (error) {
          console.error("Error checking connection:", error);
          setConnected(false);
        }
      } else {
        setConnected(false);
      }
    };

    checkConnection();
    
    // Setup listeners for connection changes
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        setConnected(accounts.length > 0);
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  const handleJoinClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setJoinDialogOpen(true);
  };

  const handleShareClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShareableLink(generateShareLink(campaign.id));
    setShareDialogOpen(true);
  };

  const handleJoinCampaign = async () => {
    if (!selectedCampaign || !userName) return;
    
    try {
      // Default to cUSD for now
      const tokenAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";
      await joinCampaign(selectedCampaign.id, tokenAddress, userName);
      setJoinDialogOpen(false);
      setUserName('');
    } catch (error) {
      console.error("Failed to join campaign:", error);
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

  if (!connected) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            <p>Please connect your wallet to view and join thrift groups.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            <p>Loading your thrift groups...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center p-8 text-red-500">
            <p>Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userCampaigns.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            <p>You have not joined any thrift groups yet. Create one to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {userCampaigns.map((campaign) => (
          <Card key={campaign.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="bg-primary/5 pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold">{campaign.name}</CardTitle>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {parseFloat(campaign.contributionAmount)} cUSD
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {campaign.description}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <UsersIcon className="h-3 w-3" />
                  <span>{campaign.totalContributions || '0'} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  <span>30 days rotation</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-3 flex justify-between">
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex items-center gap-1"
                onClick={() => handleShareClick(campaign)}
              >
                <Share2Icon className="h-3 w-3" />
                Share
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => {
                  // Navigate to campaign details page
                  window.location.href = `/thrift/${campaign.id}`;
                }}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Share Campaign Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Share Thrift Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Share <strong>{selectedCampaign?.name}</strong> with your friends</p>
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

      {/* Join Campaign Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Join Thrift Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">You are joining: <strong>{selectedCampaign?.name}</strong></p>
            <p className="text-sm text-gray-500 mb-6">
              Monthly contribution: {selectedCampaign?.contributionAmount} cUSD
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleJoinCampaign}
              disabled={loading || !userName}
            >
              {loading ? 'Joining...' : 'Request to Join'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}