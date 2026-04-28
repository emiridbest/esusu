"use client";
import React from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldIcon, InfoIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MiniSafeProvider } from '@/context/miniSafe/MiniSafeContext';
import { BalanceCard, BreakLockTab, WithdrawTab, DepositTab } from '@/components/miniSafe';

const INFO_TEXT = `MiniSafe locks your assets in a secure, time-locked vault while earning rewards.

- Deposit assets to start earning.
- Withdraw when your lock period ends, penalty-free.
- Break the lock early at any time with a 5% penalty.

All vaults are non-custodial and managed on-chain.`;

export default function MiniSafe() {
  return (
    <MiniSafeProvider>
      <div className="container mx-auto px-4 py-8 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex items-center gap-2"
        >
          <ShieldIcon className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MiniSafe</h1>
          <Popover>
            <PopoverTrigger asChild>
              <button className="ml-1 text-gray-400 hover:text-primary transition-colors">
                <InfoIcon className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
              {INFO_TEXT}
            </PopoverContent>
          </Popover>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <BalanceCard />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-gray-100 dark:border-gray-700 overflow-hidden text-gray-900 dark:text-white">
              <CardHeader className="pb-2">
                <CardTitle>Vault Operations</CardTitle>
                <CardDescription>Deposit, withdraw, or break timelocks</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="deposit">
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="deposit">Deposit</TabsTrigger>
                    <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                    <TabsTrigger value="breaklock">Break Lock</TabsTrigger>
                  </TabsList>
                  <TabsContent value="deposit"><DepositTab /></TabsContent>
                  <TabsContent value="withdraw"><WithdrawTab /></TabsContent>
                  <TabsContent value="breaklock"><BreakLockTab /></TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </MiniSafeProvider>
  );
}