"use client";
import React from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from "framer-motion";
import TransactionList from '@/components/TransactionList';

// Shadcn/UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import { ShieldIcon } from "lucide-react";

// Custom components
import { MiniSafeProvider } from '@/context/miniSafe/MiniSafeContext';
import { BalanceCard, BreakLockTab, WithdrawTab, DepositTab } from '@/components/miniSafe';
import { useMiniAppDimensions } from '@/hooks/useMiniAppDimensions';


export default function MiniSafe() {
  const dimensions = useMiniAppDimensions();

  return (
    <MiniSafeProvider>
      <div
        className={`${dimensions.containerClass} mx-auto px-4 py-2 overflow-auto`}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          maxWidth: dimensions.maxWidth,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-2"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <ShieldIcon className="mr-3 h-8 w-8 text-primary" />
            MiniSafe
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl">
            Deposit your assets into a secure, time-locked vault and earn rewards. Break the timelock early with a 5% penalty.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <BalanceCard />
          </motion.div>

          {/* Operations Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-gray-100 dark:border-gray-700 overflow-hidden text-gray-900 dark:text-white">
              <CardHeader className="pb-2">
                <CardTitle>Vault Operations</CardTitle>
                <CardDescription>Deposit, withdraw or break timelocks</CardDescription>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="deposit">
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="deposit">Deposit</TabsTrigger>
                    <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                    <TabsTrigger value="breaklock">Break Lock</TabsTrigger>
                  </TabsList>

                  <TabsContent value="deposit">
                    <DepositTab />
                  </TabsContent>

                  <TabsContent value="withdraw">
                    <WithdrawTab />
                  </TabsContent>

                  <TabsContent value="breaklock">
                    <BreakLockTab />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Transaction History */}
        <div className="mt-8">
          <TransactionList />
        </div>
      </div>
    </MiniSafeProvider>
  );
}
