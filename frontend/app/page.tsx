"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import TransactionList from "@/components/TransactionList";
import Hero from "@/components/Hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Sparkles,
  Wallet,
  Star,
  ArrowDownToLine,
} from "lucide-react";
import { 
  UserGroupIcon, 
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export interface Campaign {
  [x: string]: any;
  name: string;
  description: string;
  contributionAmount: number;
  payoutInterval: number;
  lastPayoutBlock: number;
  totalContributions: number;
  userName: [string];
  id: number;
}

const QuickAction = ({
  icon,
  title,
  description,
  href,
  variant = "default",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  variant?: "default" | "outline";
}) => {
  const router = useRouter();

return (
  <Card
    className={cn(
      "cursor-pointer transition-all duration-200 hover:shadow-md border border-gray-200 dark:border-neutral-800",
      variant === "outline"
        ? "bg-white dark:bg-neutral-900"
        : "bg-gray-50 dark:bg-neutral-800"
    )}
    onClick={() => router.push(href)}
  >
    <CardContent className="p-5 flex flex-row items-center gap-4">
      <div
        className={cn(
          "rounded-md p-3 flex items-center justify-center",
          variant === "outline"
            ? "bg-gray-100 dark:bg-neutral-700"
            : "bg-white dark:bg-neutral-900"
        )}
      >
        {icon}
      </div>

      <div>
        <h3 className="font-medium text-base">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>

      <div className="ml-auto">
        <ArrowRight className="h-5 w-5 text-primary" />
      </div>
    </CardContent>
  </Card>
);
};

const Esusu: React.FC = () => {
  const router = useRouter();

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-8 pb-20">
      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="my-6"
      >

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 dark:text-white">
          <QuickAction
            icon={<Wallet className="text-primary h-6 w-6" />}
            title="Add Funds"
            description="Lock up funds and start earning"
            href="/miniSafe"
          />

          <QuickAction
            icon={<UserGroupIcon className="text-primary h-6 w-6" />}
            title="Join a Thrift"
            description="Save with friends and family"
            href="/thrift"
            variant="outline"
          />

          <QuickAction
            icon={<ArrowDownToLine className="text-primary h-6 w-6" />}
            title="Withdraw"
            description="Transfer funds to your wallet"
            href="/miniSafe"
            variant="outline"
          />

          <QuickAction
            icon={<Star className="text-green-500 h-6 w-6" />}
            title="Claim Loyalty Rewards"
            description="Earn G$ for being an Esusu OG"
            href="/rewards"
            variant="outline"
          />
        </div>
      </motion.div>

      {/* Tabbed Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8"
      >
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="links">Quick Links</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions" className="mt-4">
            <Card className="border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-black/90 backdrop-blur-md">
              <TransactionList />
            </Card>
          </TabsContent>
          <TabsContent value="features" className="mt-4">
            <Card className="border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-black/90 backdrop-blur-md">
              <CardContent className="pt-6">
                <Hero />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* App Download Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-10"
      >
        <Card className="bg-gradient-to-r from-primary/20 to-purple-500/20 backdrop-blur-md border-none overflow-hidden">
          <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between">
            <div className="mb-6 sm:mb-0">
              <h3 className="text-xl font-semibold mb-2">Get the Esusu Mobile App</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-md">
                Manage your savings, join thrifts, and track your finances on the go with our mobile app
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="default" className="gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
                    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
                  </svg>
                  App Store
                </Button>
                <Button variant="outline" className="gap-2 border-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 3 4.2 15.5 1 12.5 13 3" />
                    <polygon points="13 3 21.8 15.5 23 13.5 13 3" />
                    <polygon points="11.5 21 16.5 11 21.8 15.5 11.5 21" />
                    <polygon points="11.5 21 4.2 15.5 6.5 11 11.5 21" />
                  </svg>
                  Play Store
                </Button>
              </div>
            </div>
            <div className="relative w-40 h-40 sm:w-48 sm:h-48">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse blur-xl"></div>
              <Image
                src="/esusu.png"
                priority
                alt="Esusu App"
                width={180}
                height={180}
                className="relative z-10"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Esusu;