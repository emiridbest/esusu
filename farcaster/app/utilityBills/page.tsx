"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PhoneIcon, Smartphone, Zap, Tv, WalletIcon, CreditCard, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import CableSubscriptionForm from '@/components/utilityBills/CableSubscriptionForm';
import ElectricityBillForm from '@/components/utilityBills/ElectricityBillForm';
import MobileDataForm from '@/components/utilityBills/MobileDataForm';
import { UtilityProvider } from '@/context/utilityProvider/UtilityContext';
const UtilityBills: React.FC = () => {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('mobile-data');

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <UtilityProvider>
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Utility Bills</CardTitle>
          <CardDescription>Pay your utility bills with crypto</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mobile-data" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3 gap-1">
          <TabsTrigger value="mobile-data" className="w-full">
                <Smartphone className="mr-2" /> Data
              </TabsTrigger>
              <TabsTrigger value="cable-subscription" className="w-full">
                <Tv className="mr-2" /> Cable
              </TabsTrigger>
              <TabsTrigger value="electricity-bill" className="w-full">
                <Zap className="mr-2" /> Electricity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mobile-data">
              <MobileDataForm />
            </TabsContent>

            <TabsContent value="cable-subscription">
              <CableSubscriptionForm />
            </TabsContent>

            <TabsContent value="electricity-bill">
              <ElectricityBillForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </UtilityProvider>
  );
}

export default UtilityBills;
