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
  const { countryData } = useUtility();

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <div className="container mx-auto">
      {/* Main Utility Bills Card */}

        <CardContent>
          <Tabs defaultValue="mobile-data" onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 gap-2 bg-muted/50 p-1">
              <TabsTrigger
                value="mobile-data"
                className="w-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
                disabled={countryData ? !countryData.servicesAvailable.data : undefined}
              >
                <Smartphone className="mr-2 h-4 w-4" /> Data
              </TabsTrigger>
              <TabsTrigger
                value="airtime"
                className="w-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
                disabled={countryData ? !countryData.servicesAvailable.airtime : undefined}
              >
                <PhoneIcon className="mr-2 h-4 w-4" /> Airtime
              </TabsTrigger>
              <TabsTrigger
                value="electricity-bill"
                className="w-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
                disabled={countryData ? !countryData.servicesAvailable.electricity : undefined}
              >
                <Zap className="mr-2 h-4 w-4" /> Electricity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mobile-data" className="mt-0 focus-visible:ring-0">
              <MobileDataForm />
            </TabsContent>

            <TabsContent value="airtime" className="mt-0 focus-visible:ring-0">
              <AirtimeForm />
            </TabsContent>
            <TabsContent value="electricity-bill" className="mt-0 focus-visible:ring-0">
              <ElectricityBillForm />
            </TabsContent>

          </Tabs>
        </CardContent>

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