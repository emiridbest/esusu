"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThriftGroup, ThriftMember, useThrift } from '@/context/thrift/ThriftContext';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import EditMetadataDialog from '@/components/thrift/EditMetadataDialog';
import { contractAddress } from '@/utils/abi';

export function UserCampaigns() {
  const { userGroups, getThriftGroupMembers, loading, error } = useThrift();
  const [groupMembers, setGroupMembers] = useState<{ [key: number]: ThriftMember[] }>({});
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
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
  
  // Load members for all user groups
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
  
  if (!connected) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            <p>Please connect your wallet to view your thrift groups.</p>
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
  
  if (userGroups.length === 0) {
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Thrift Groups</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Deposit</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">
                        <a 
                          href={`/thrift/${group.id}`}
                          className="hover:underline text-primary"
                        >
                          {group.name}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {group.description}
                      </TableCell>
                      <TableCell>{parseFloat(group.depositAmount)} cUSD</TableCell>
                      <TableCell>{group.totalMembers}/{group.maxMembers}</TableCell>
                      <TableCell>
                        {address && group.meta?.createdBy && address === String(group.meta.createdBy).toLowerCase() ? (
                          <button
                            className="text-xs px-3 py-1 border rounded hover:bg-muted"
                            onClick={() => { setEditGroup(group); setEditOpen(true); }}
                          >
                            Edit
                          </button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="members">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">
                        <a 
                          href={`/thrift/${group.id}`}
                          className="hover:underline text-primary"
                        >
                          {group.name}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {groupMembers[group.id]?.map((member, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="text-xs text-gray-500">
                                {member.address.substring(0, 6)}...{member.address.substring(member.address.length - 4)}
                              </span>
                            </div>
                          )) || <span className="text-gray-500">Loading members...</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={(group.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200") + " border"}>
                          {group.isActive ? 'Active' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="contributions">
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Your Contribution</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Next Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">
                        <a 
                          href={`/thrift/${group.id}`}
                          className="hover:underline text-primary"
                        >
                          {group.name}
                        </a>
                      </TableCell>
                      <TableCell>{parseFloat(group.depositAmount)} cUSD</TableCell>
                      <TableCell>
                        {new Date().toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        Round {group.currentRound + 1}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
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
            // no direct refresh function here; rely on ThriftContext updates triggered elsewhere or reload page
          }}
        />
      ) : null}
    </Card>
  );
}