"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Campaign, CampaignMember, useThrift } from '@/context/thrift/ThriftContext';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

export function UserCampaigns() {
  const { userCampaigns, getCampaignMembers, loading, error } = useThrift();
  const [campaignMembers, setCampaignMembers] = useState<{ [key: number]: CampaignMember[] }>({});
  const [connected, setConnected] = useState(false);
  
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
  
  // Load members for all user campaigns
  useEffect(() => {
    const loadAllMembers = async () => {
      if (!connected || userCampaigns.length === 0) return;
      
      const membersMap: { [key: number]: CampaignMember[] } = {};
      
      for (const campaign of userCampaigns) {
        try {
          const members = await getCampaignMembers(campaign.id);
          membersMap[campaign.id] = members;
        } catch (error) {
          console.error(`Failed to fetch members for campaign ${campaign.id}:`, error);
        }
      }
      
      setCampaignMembers(membersMap);
    };
    
    loadAllMembers();
  }, [userCampaigns, connected, getCampaignMembers]);
  
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
  
  if (userCampaigns.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            <p>You haven't joined any thrift groups yet. Create one to get started!</p>
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
                    <TableHead>Monthly</TableHead>
                    <TableHead>Members</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        <a 
                          href={`/thrift/${campaign.id}`}
                          className="hover:underline text-primary"
                        >
                          {campaign.name}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {campaign.description}
                      </TableCell>
                      <TableCell>{parseFloat(campaign.contributionAmount)} cUSD</TableCell>
                      <TableCell>{campaign.totalContributions || '0'}/5</TableCell>
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
                  {userCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        <a 
                          href={`/thrift/${campaign.id}`}
                          className="hover:underline text-primary"
                        >
                          {campaign.name}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {campaignMembers[campaign.id]?.map((member, idx) => (
                            <div key={idx} className="text-sm">
                              {member.userName} 
                              <span className="text-xs text-gray-500 ml-1">
                                ({member.address.substring(0, 6)}...{member.address.substring(member.address.length - 4)})
                              </span>
                            </div>
                          )) || <span className="text-gray-500">Loading members...</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
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
                  {userCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        <a 
                          href={`/thrift/${campaign.id}`}
                          className="hover:underline text-primary"
                        >
                          {campaign.name}
                        </a>
                      </TableCell>
                      <TableCell>{parseFloat(campaign.contributionAmount)} cUSD/month</TableCell>
                      <TableCell>
                        {new Date().toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}