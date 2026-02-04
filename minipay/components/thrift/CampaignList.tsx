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
import { useAccount } from 'wagmi';

export function CampaignList() {
  const { allGroups, joinThriftGroup, generateShareLink, loading, error, refreshGroups } = useThrift();
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');

  const [selectedGroup, setSelectedGroup] = useState<ThriftGroup | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shareableLink, setShareableLink] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<ThriftGroup | null>(null);

  const isWalletConnected = Boolean(isConnected && address);

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
      console.log('📤 CampaignList - Joining group with details:', { userName });
      await joinThriftGroup(selectedGroup.id, userName);  // ✅ Pass userName!
      setJoinDialogOpen(false);
      setUserName('');
      setEmail('');
      setPhone('');

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

  if (!isWalletConnected) {
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

  if (error && !isWalletConnected) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center p-8 text-amber-600">
            <p className="mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="bg-primary/20 border-primary/60 text-primary font-semibold hover:bg-primary/30 hover:border-primary/80 transition-all duration-300">
              Refresh Page
            </Button>
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
      <div className="w-full mb-4">
        <div className="rounded-md border p-4 bg-background">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="flex flex-col gap-1">
              <Label htmlFor="categoryFilter">Category</Label>
              <Input
                id="categoryFilter"
                placeholder="e.g. savings, friends, work"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="tagsFilter">Tags</Label>
              <Input
                id="tagsFilter"
                placeholder="comma,separated,tags"
                value={tagsFilter}
                onChange={(e) => setTagsFilter(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setCategoryFilter(''); setTagsFilter(''); }}
                className="w-full md:w-auto bg-primary/20 border-primary/60 text-primary font-semibold hover:bg-primary/30 hover:border-primary/80 transition-all duration-300"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {filteredGroups.length === 0 ? (
        <Card className="w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="text-base font-medium mb-1">No results</div>
            <div className="text-sm text-neutral-500 mb-4">Try clearing filters or adjust your category/tags.</div>
            <Button
              variant="outline"
              onClick={() => { setCategoryFilter(''); setTagsFilter(''); }}
              className="bg-primary/20 border-primary/60 text-primary font-semibold hover:bg-primary/30 hover:border-primary/80 transition-all duration-300"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {group.meta?.coverImageUrl ? (
                <img src={group.meta.coverImageUrl} alt={group.name} className="w-full h-40 object-cover" onError={() => { /* ignore */ }} />
              ) : null}
              <CardHeader className="bg-primary/5 pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold">{group.name}</CardTitle>
                    {address && group.meta?.createdBy && address.toLowerCase() === String(group.meta.createdBy).toLowerCase() && (
                      <Button size="sm" variant="outline" onClick={() => handleEditClick(group)} className="bg-primary/20 border-primary/60 text-primary font-semibold hover:bg-primary/30 hover:border-primary/80 transition-all duration-300">Edit</Button>
                    )}
                  </div>
                  <Badge className="bg-primary/10 text-primary border border-primary/20">
                    {parseFloat(group.depositAmount)} {group.tokenSymbol || 'cUSD'}
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
                  className="text-xs flex items-center gap-1 bg-primary/20 border-primary/60 text-primary font-semibold hover:bg-primary/30 hover:border-primary/80 transition-all duration-300"
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
      )}

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
            <Button variant="outline" onClick={() => setShareDialogOpen(false)} className="bg-primary/20 border-primary/60 text-primary font-semibold hover:bg-primary/30 hover:border-primary/80 transition-all duration-300">Cancel</Button>
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
            <p className="text-sm text-gray-500 mb-2">
              Contribution amount: {selectedGroup?.depositAmount} {selectedGroup?.tokenSymbol || 'cUSD'}
            </p>
            {selectedGroup?.isPublic && (
              <p className="text-sm text-amber-600 dark:text-amber-500 mb-6 font-medium">
                Required Collateral: {(parseFloat(selectedGroup?.depositAmount || '0') * 5).toFixed(2)} {selectedGroup?.tokenSymbol || 'cUSD'}
              </p>
            )}
            <div className="grid gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="text-lg"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)} className="bg-primary/20 border-primary/60 text-primary font-semibold hover:bg-primary/30 hover:border-primary/80 transition-all duration-300">Cancel</Button>
            <Button
              onClick={handleJoinGroup}
              disabled={loading || !userName.trim() || !email.trim() || !phone.trim()}
            >
              {loading ? 'Joining...' : 'Join Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}