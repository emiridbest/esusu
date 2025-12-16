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
  const {  countryData } = useUtility();
  const dimensions = useMiniAppDimensions();

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <div
      className={`${dimensions.containerClass} mx-auto px-2 pt-2 pb-10 overflow-auto`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        maxWidth: dimensions.maxWidth,
      }}
    >
      {/* Main Utility Bills Card */}
      <div >
         <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-2"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
            <ShieldIcon className="mr-3 h-8 w-8 text-primary" />
            Pay Bills
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl">
          Select from mobile data, airtime, and electricity tab to get started.
          </p>
        </motion.div>
        </div>
      <Card className='backdrop-blur-md '>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/70 via-primary/40 to-primary/10 rounded-full"></div>
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