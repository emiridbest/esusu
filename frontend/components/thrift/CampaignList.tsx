"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThriftGroup, useThrift } from '@/context/thrift/ThriftContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import EditMetadataDialog from '@/components/thrift/EditMetadataDialog';
import { contractAddress } from '@/utils/abi';
import { ThriftGroupCard } from '@/components/thrift/ThriftGroupCard';
import { YieldCalculator } from '@/components/thrift/YieldCalculator';
import { Share2Icon } from 'lucide-react';

export function CampaignList() {
  const { allGroups, joinThriftGroup, generateShareLink, loading, error, refreshGroups } = useThrift();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');

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
      console.log('📤 CampaignList - Joining group with userName:', userName);
      await joinThriftGroup(selectedGroup.id, userName);
      setJoinDialogOpen(false);
      setUserName('');

      toast({
        title: "Successfully joined!",
        description: `You are now a member of ${selectedGroup.name}`,
      });
    } catch (error) {
      console.error("Failed to join thrift group:", error);
      toast({
        title: "Failed to join",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
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

  if (!connected) {
    return (
      <Card className="w-full border-dashed border-2">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            <p className="text-muted-foreground">Please connect your wallet to view and join thrift groups.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full border-none shadow-none bg-transparent">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your thrift groups...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-500/20 bg-red-500/5">
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
      <Card className="w-full border-dashed">
        <CardContent className="pt-6">
          <div className="text-center p-8 text-muted-foreground">
            <p>No thrift groups available yet. Create one to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Apply filters once and reuse for rendering
  const filteredGroups = allGroups
    .filter(group => group.isPublic && !group.isUserMember)
    .filter(group => {
      // Category filter (substring, case-insensitive)
      if (categoryFilter.trim()) {
        const cat = group.meta?.category || '';
        if (!cat.toLowerCase().includes(categoryFilter.trim().toLowerCase())) return false;
      }
      // Tags filter (all tokens must be present, case-insensitive substring)
      if (tagsFilter.trim()) {
        const tokens = tagsFilter.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        const tags = (group.meta?.tags || []).map(t => String(t).toLowerCase());
        const allPresent = tokens.every(tok => tags.some(tag => tag.includes(tok)));
        if (!allPresent) return false;
      }
      return true;
    });

  return (
    <>
      {/* Filters */}
      <div className="w-full mb-6">
        <div className="rounded-xl border border-border/50 p-4 bg-background/50 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryFilter" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
              <Input
                id="categoryFilter"
                placeholder="e.g. savings, friends"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tagsFilter" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</Label>
              <Input
                id="tagsFilter"
                placeholder="tag1, tag2"
                value={tagsFilter}
                onChange={(e) => setTagsFilter(e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setCategoryFilter(''); setTagsFilter(''); }}
                className="w-full md:w-auto text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {filteredGroups.length === 0 ? (
        <Card className="w-full border-dashed bg-transparent">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="text-lg font-medium mb-2">No matching groups found</div>
            <div className="text-sm text-neutral-500 mb-6">Try adjusting your filters</div>
            <Button
              variant="outline"
              onClick={() => { setCategoryFilter(''); setTagsFilter(''); }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {filteredGroups.map((group) => (
            <ThriftGroupCard
              key={group.id}
              group={group}
              currentUserAddress={address}
              onJoin={handleJoinClick}
              onShare={handleShareClick}
              onEdit={handleEditClick}
            />
          ))}
        </div>
      )}

      {/* Share Campaign Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px] dark:text-white/90">
          <DialogHeader>
            <DialogTitle>Share Thrift Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-muted-foreground">Share <strong>{selectedGroup?.name}</strong> with your friends</p>
            <div className="grid gap-4">
              <div className="flex items-center gap-2">
                <Input
                  id="shareLink"
                  value={shareableLink}
                  readOnly
                  className="flex-1 font-mono text-xs"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button onClick={copyToClipboard} size="icon" variant="outline"><Share2Icon className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
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
        <DialogContent className="sm:max-w-[800px] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl">Join {selectedGroup?.name}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            {/* Left Column: Form */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Group Details</h3>
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Required Deposit:</span>
                    <span className="font-bold">{selectedGroup?.depositAmount} {selectedGroup?.tokenSymbol || 'cUSD'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Round:</span>
                    <span>{selectedGroup?.currentRound}</span>
                  </div>
                  {selectedGroup?.isPublic && (
                    <div className="flex justify-between text-amber-500">
                      <span className="text-muted-foreground">Required Collateral:</span>
                      <span className="font-bold">{(parseFloat(selectedGroup?.depositAmount || '0') * 5).toFixed(2)} {selectedGroup?.tokenSymbol || 'cUSD'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userName">Your Display Name</Label>
                <Input
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Satoshi Nakamoto"
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">This name will be visible to other group members.</p>
              </div>
            </div>

            {/* Right Column: Calculator */}
            <div className="border-l pl-8 border-border/50">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">Estimated Returns</h3>
              <YieldCalculator
                depositToken={selectedGroup?.tokenSymbol || 'cUSD'}
                defaultAmount={parseFloat(selectedGroup?.depositAmount || '0')}
                APY={5 + (parseFloat(selectedGroup?.depositAmount || '0') > 100 ? 2 : 0)} // Dynamic mocked APY based on size
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between items-center pt-4 border-t mt-4">
            <div className="text-xs text-muted-foreground">
              By joining, you agree to the group rules.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleJoinGroup}
                disabled={loading || !userName.trim()}
                className="bg-primary text-primary-foreground font-bold px-8"
              >
                {loading ? 'Confirming...' : 'Join Now'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}