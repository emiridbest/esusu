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
import { useAccount } from 'wagmi';

export function UserCampaigns() {
  const { userGroups, getThriftGroupMembers, loading, error, refreshGroups } = useThrift();
  const [groupMembers, setGroupMembers] = useState<{ [key: number]: ThriftMember[] }>({});
  const { address, isConnected } = useAccount();
  const [editOpen, setEditOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<ThriftGroup | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const isWalletConnected = Boolean(isConnected && address);

  // Load members for all user groups
  useEffect(() => {
    // Don't use async directly in useEffect - create an inner function
    const loadAllMembers = async () => {
      if (!isWalletConnected || userGroups.length === 0) {
        console.log('Skipping member load:', { isWalletConnected, groupCount: userGroups.length });
        return;
      }

      console.log('Loading members for', userGroups.length, 'groups');
      setLoadingMembers(true);

      try {
        const membersMap: { [key: number]: ThriftMember[] } = {};

        for (const group of userGroups) {
          try {
            console.log(`Fetching members for group ${group.id}`);
            const members = await getThriftGroupMembers(group.id);
            membersMap[group.id] = members;
            console.log(`Loaded ${members.length} members for group ${group.id}`);
          } catch (error) {
            console.error(`Failed to fetch members for group ${group.id}:`, error);
            // Continue loading other groups even if one fails
            membersMap[group.id] = [];
          }
        }

        console.log('Setting group members:', Object.keys(membersMap).length, 'groups');
        setGroupMembers(membersMap);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    // Call the async function
    loadAllMembers();
  }, [userGroups.length, isWalletConnected]); // Simplified dependencies - only length matters

  // Early returns with better messaging
  if (!isWalletConnected) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            <p>Please connect your wallet to view your Esusu groups.</p>
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
            <p>Loading your Esusu groups...</p>
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
            <button
              onClick={() => refreshGroups()}
              className="mt-4 text-xs px-3 py-1 border rounded hover:bg-muted"
            >
              Retry
            </button>
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
            <p>You have not joined any Esusu groups yet. Create one to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Esusu Groups</CardTitle>
          <button
            onClick={() => refreshGroups()}
            className="text-xs px-3 py-1 border rounded hover:bg-muted"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>

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
                        <TableCell>{parseFloat(group.depositAmount)} {group.tokenSymbol || 'cUSD'}</TableCell>
                        <TableCell>{group.totalMembers}/{group.maxMembers}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <a
                              href={`/thrift/${group.id}`}
                              className="text-xs px-3 py-1 border rounded hover:bg-muted text-center"
                            >
                              View
                            </a>
                            {address && group.meta?.createdBy && address.toLowerCase() === String(group.meta.createdBy).toLowerCase() && (
                              <button
                                className="text-xs px-3 py-1 border rounded hover:bg-muted"
                                onClick={() => { setEditGroup(group); setEditOpen(true); }}
                              >
                                Edit
                              </button>
                            )}
                            {group.isUserMember && group.isActive && (
                              <button
                                className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                onClick={() => {/* Add make contribution logic */ }}
                              >
                                Contribute
                              </button>
                            )}
                          </div>
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
                            {loadingMembers ? (
                              <span className="text-gray-500">Loading members...</span>
                            ) : groupMembers[group.id]?.length > 0 ? (
                              groupMembers[group.id].map((member, idx) => (
                                <div key={idx} className="text-sm">
                                  <div className="font-medium">{member.userName || `Member ${idx + 1}`}</div>
                                  <span className="text-xs text-gray-500">
                                    {member.address.substring(0, 6)}...{member.address.substring(member.address.length - 4)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-500">No members loaded</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={(
                            group.isActive && group.totalMembers >= group.maxMembers
                              ? "bg-green-50 text-green-700 border-green-200"
                              : group.isActive
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          ) + " border"}>
                            {group.isActive && group.totalMembers >= group.maxMembers
                              ? 'Full'
                              : group.isActive
                                ? 'Active'
                                : 'Pending'}
                          </Badge>
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
              refreshGroups();
            }}
          />
        ) : null}
      </Card>
    </div>
  );
}