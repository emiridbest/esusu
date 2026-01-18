"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PhoneIcon, Smartphone, Zap, Tv, WalletIcon, CreditCard, Loader2, ShieldIcon } from 'lucide-react';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import AirtimeForm from '@/components/utilityBills/AirtimeForm';
import MobileDataForm from '@/components/utilityBills/MobileDataForm';
import { UtilityProvider, useUtility } from '@/context/utilityProvider/UtilityContext';
import ElectricityBillForm from '@/components/utilityBills/ElectricityBillForm';
import { useMiniAppDimensions } from '@/hooks/useMiniAppDimensions';

// Main content component - separated to use the useUtility hook
function MainContent() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('mobile-data');
  const { countryData } = useUtility();
  const dimensions = useMiniAppDimensions();

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <div
      className={`${dimensions.containerClass} mx-auto mb-6 px-2 py-4 overflow-auto`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        maxWidth: dimensions.maxWidth,
      }}
    >
      {/* Main Utility Bills Card */}
      <Card className="bg-white/50 dark:bg-black/40 backdrop-blur-md border border-gray-100 dark:border-gray-800 shadow-xl shadow-primary/5">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white">
            Utility Bills
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Pay your utility bills with crypto
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs defaultValue="mobile-data" onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 gap-2 bg-gray-100/50 dark:bg-gray-900/50 p-1 rounded-xl">
              <TabsTrigger
                value="mobile-data"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:shadow-md rounded-lg transition-all duration-300 font-medium text-xs py-2"
              >
                <Smartphone className="mr-1 h-3 w-3" /> Data
              </TabsTrigger>
              <TabsTrigger
                value="airtime"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:shadow-md rounded-lg transition-all duration-300 font-medium text-xs py-2"
              >
                <PhoneIcon className="mr-1 h-3 w-3" /> Airtime
              </TabsTrigger>
              <TabsTrigger
                value="electricity-bill"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:text-primary dark:data-[state=active]:text-primary data-[state=active]:shadow-md rounded-lg transition-all duration-300 font-medium text-xs py-2"
              >
                <Zap className="mr-1 h-3 w-3" /> Power
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mobile-data" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <MobileDataForm />
            </TabsContent>

            <TabsContent value="airtime" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <AirtimeForm />
            </TabsContent>
            <TabsContent value="electricity-bill" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
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