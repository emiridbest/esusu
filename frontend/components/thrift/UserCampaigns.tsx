"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ThriftGroup, ThriftMember, useThrift } from '@/context/thrift/ThriftContext';
import { useToast } from '@/hooks/use-toast';
import EditMetadataDialog from '@/components/thrift/EditMetadataDialog';
import { contractAddress } from '@/utils/abi';
import { ThriftGroupCard } from '@/components/thrift/ThriftGroupCard';
import { GroupDetailsDialog } from '@/components/thrift/GroupDetailsDialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export function UserCampaigns() {
  const { userGroups, getThriftGroupMembers, loading, error, refreshGroups } = useThrift();
  const [groupMembers, setGroupMembers] = useState<{ [key: number]: ThriftMember[] }>({});
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<ThriftGroup | null>(null);

  // Details Dialog State
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ThriftGroup | null>(null);

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

  // Load members for all user groups (Background fetch)
  // Optimization warning: This fetches for ALL groups. 
  // Good for trust score logic but maybe lazy load later.
  useEffect(() => {
    const loadAllMembers = async () => {
      if (!connected || userGroups.length === 0) return;

      const membersMap: { [key: number]: ThriftMember[] } = {};

      for (const group of userGroups) {
        try {
          const members = await getThriftGroupMembers(group.id);
          membersMap[group.id] = members;
        } catch (error) {
          console.error(`Failed to fetch members for group ${group.id}:`, error);
        }
      }
      setGroupMembers(membersMap);
    };
    loadAllMembers();
  }, [userGroups, connected, getThriftGroupMembers]);

  const handleManageClick = (group: ThriftGroup) => {
    setSelectedGroup(group);
    setDetailsOpen(true);
  };

  const handleEditClick = (group: ThriftGroup) => {
    setEditGroup(group);
    setEditOpen(true);
  };

  const handleShareClick = (group: ThriftGroup) => {
    // Implement share logic or reuse from CampaignList if needed
    // For now, details dialog might be enough
    console.log("Share", group.name);
  };

  if (!connected) {
    return (
      <Card className="w-full border-dashed border-2">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            <p className="text-muted-foreground">Please connect your wallet to view your thrift groups.</p>
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

  if (userGroups.length === 0) {
    return (
      <Card className="w-full border-dashed">
        <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <PlusCircle className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Groups Joined</h3>
          <p className="text-muted-foreground max-w-sm text-center mb-6">
            You haven&apos;t joined any thrift groups yet. Browse available groups to start saving with your community.
          </p>
          <Button onClick={() => document.getElementById('available-groups-trigger')?.click()}>
            Browse Groups
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {userGroups.map((group) => (
          <ThriftGroupCard
            key={group.id}
            group={group}
            currentUserAddress={address}
            variant="manage"
            onManage={handleManageClick}
            onShare={handleShareClick}
            onEdit={handleEditClick}
            onJoin={() => { }} // Not used in manage mode
          />
        ))}
      </div>

      {/* Group Details Dialog */}
      <GroupDetailsDialog
        group={selectedGroup}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        members={selectedGroup ? (groupMembers[selectedGroup.id] || []) : []}
        currentUserAddress={address}
      />

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
            refreshGroups();
          }}
        />
      ) : null}
    </>
  );
}