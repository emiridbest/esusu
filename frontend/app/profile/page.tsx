"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const { isConnected, address } = useAccount();
  const router = useRouter();

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile</h1>
          <p className="mb-6">Please connect your wallet to view your profile.</p>
          <Button onClick={() => router.push('/')}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500">Wallet Address</span>
              <span className="font-mono">{address}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="activity">
        <TabsList className="mb-6">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="thrift">Thrift Groups</TabsTrigger>
          <TabsTrigger value="miniSafe">MiniSafe</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Your recent transaction history will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="thrift">
          <Card>
            <CardHeader>
              <CardTitle>My Thrift Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <p className="text-gray-500">Your thrift groups will appear here.</p>
                <Button 
                  onClick={() => router.push('/thrift')}
                  className="w-fit"
                >
                  View All Thrift Groups
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="miniSafe">
          <Card>
            <CardHeader>
              <CardTitle>My MiniSafe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <p className="text-gray-500">Your MiniSafe information will appear here.</p>
                <Button 
                  onClick={() => router.push('/miniSafe')}
                  className="w-fit"
                >
                  Go to MiniSafe
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Account settings will be available soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}