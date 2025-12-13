"use client";

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const router = useRouter();

  return (
    <div className="w-full py-6">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>

      <Tabs defaultValue="activity">
        <TabsList className="mb-6">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="thrift">Groups</TabsTrigger>
          <TabsTrigger value="miniSafe">MiniSafe</TabsTrigger>
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
              <p className="text-gray-500">Account settings.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
