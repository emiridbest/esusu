"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PhoneIcon, Smartphone, Zap, Tv, WalletIcon, CreditCard, Loader2 } from 'lucide-react';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import AirtimeForm from '@/components/utilityBills/AirtimeForm';
import MobileDataForm from '@/components/utilityBills/MobileDataForm';
import { UtilityProvider, useUtility } from '@/context/utilityProvider/UtilityContext';
import ElectricityBillForm from '@/components/utilityBills/ElectricityBillForm';

// Main content component - separated to use the useUtility hook
function MainContent() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('mobile-data');
  const {  countryData } = useUtility();

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <div className="container mx-auto">
      {/* Main Utility Bills Card */}
      <Card>
        <CardHeader>
          <CardTitle>Utility Bills</CardTitle>
          <CardDescription>Pay your utility bills with crypto</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mobile-data" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3 gap-1">
              <TabsTrigger 
                value="mobile-data" 
                className="w-full"
              >
                <Smartphone className="mr-2" /> Data
              </TabsTrigger>
              <TabsTrigger 
                value="airtime" 
                className="w-full"
              >
                <PhoneIcon className="mr-2" /> Airtime
              </TabsTrigger>
              <TabsTrigger 
                value="electricity-bill" 
                className="w-full"
              >
                <Zap className="mr-2" /> Electricity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mobile-data">
              <MobileDataForm />
            </TabsContent>

            <TabsContent value="airtime">
              <AirtimeForm />
            </TabsContent>
            <TabsContent value="electricity-bill">
              <ElectricityBillForm />
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

const UtilityBills: React.FC = () => {
  return (
    <UtilityProvider>
      <MainContent />
    </UtilityProvider>
  );
}

export default UtilityBills;