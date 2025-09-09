"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThriftGroup, useThrift } from '@/context/thrift/ThriftContext';
import { UsersIcon, CalendarIcon, Share2Icon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import EditMetadataDialog from '@/components/thrift/EditMetadataDialog';
import { contractAddress } from '@/utils/abi';

export function CampaignList() {
  const { allGroups, joinThriftGroup, generateShareLink, loading, error, refreshGroups } = useThrift();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  
  const [selectedGroup, setSelectedGroup] = useState<ThriftGroup | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [shareableLink, setShareableLink] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<ThriftGroup | null>(null);

  // Check if wallet is connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          setConnected(accounts && accounts.length > 0);
          setAddress(accounts && accounts.length > 0 ? String(accounts[0]).toLowerCase() : null);
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
        setAddress(accounts.length > 0 ? String(accounts[0]).toLowerCase() : null);
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  const handleJoinClick = (group: ThriftGroup) => {
    setSelectedGroup(group);
    setJoinDialogOpen(true);
  };

  const handleShareClick = (group: ThriftGroup) => {
    setSelectedGroup(group);
    setShareableLink(generateShareLink(group.id));
    setShareDialogOpen(true);
  };

  const handleEditClick = (group: ThriftGroup) => {
    setEditGroup(group);
    setEditOpen(true);
  };

  const handleJoinGroup = async () => {
    if (!selectedGroup) return;
    
    try {
      await joinThriftGroup(selectedGroup.id);
      setJoinDialogOpen(false);
      setUserName('');
    } catch (error) {
      console.error("Failed to join thrift group:", error);
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

  if (allGroups.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            <p>No thrift groups available yet. Create one to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {allGroups.filter(group => group.isPublic && !group.isUserMember).map((group) => (
          <Card key={group.id} className="overflow-hidden hover:shadow-md transition-shadow">
            {group.meta?.coverImageUrl ? (
              <img src={group.meta.coverImageUrl} alt={group.name} className="w-full h-40 object-cover" onError={() => { /* ignore */ }} />
            ) : null}
            <CardHeader className="bg-primary/5 pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-semibold">{group.name}</CardTitle>
                  {address && group.meta?.createdBy && address === String(group.meta.createdBy).toLowerCase() && (
                    <Button size="sm" variant="outline" onClick={() => handleEditClick(group)}>Edit</Button>
                  )}
                </div>
                <Badge className="bg-primary/10 text-primary border border-primary/20">
                  {parseFloat(group.depositAmount)} cUSD
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                {group.description}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <UsersIcon className="h-3 w-3" />
                  <span>{group.totalMembers}/{group.maxMembers} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{group.isActive ? 'Active' : 'Pending'}</span>
                </div>
                {group.meta?.category ? (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Category:</span>
                    <span>{group.meta.category}</span>
                  </div>
                ) : null}
                {group.meta?.tags && group.meta.tags.length > 0 ? (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Tags:</span>
                    <span>{group.meta.tags.join(', ')}</span>
                  </div>
                ) : null}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-3 flex justify-between">
              <Button
                size="sm"
                variant="outline"
                className="text-xs flex items-center gap-1"
                onClick={() => handleShareClick(group)}
              >
                <Share2Icon className="h-3 w-3" />
                Share
              </Button>
              <Button
                size="sm"
                className="text-xs"
                onClick={() => handleJoinClick(group)}
                disabled={group.totalMembers >= group.maxMembers}
              >
                {group.totalMembers >= group.maxMembers ? 'Full' : 'Join Group'}
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
            <p className="mb-4">Share <strong>{selectedGroup?.name}</strong> with your friends</p>
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

      {/* Edit Metadata Dialog */}
      {editGroup ? (
        <EditMetadataDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          contractAddress={contractAddress}
          groupId={editGroup.id}
          initialName={editGroup.name}
          initialDescription={editGroup.description}
          initialCoverImageUrl={editGroup.meta?.coverImageUrl}
          initialCategory={editGroup.meta?.category}
          initialTags={editGroup.meta?.tags}
          onSaved={() => {
            setEditOpen(false);
            setTimeout(() => refreshGroups(), 50);
          }}
        />
      ) : null}

      {/* Join Campaign Dialog */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Join Thrift Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">You are joining: <strong>{selectedGroup?.name}</strong></p>
            <p className="text-sm text-gray-500 mb-6">
              Deposit amount: {selectedGroup?.depositAmount} cUSD
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
              onClick={handleJoinGroup}
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}