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
  Star,
  ArrowDownToLine,
  SmartphoneIcon,
} from "lucide-react";
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

const quickActions = [
  {
    icon: ArrowDownToLine,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    title: "Buy Airtime & Data",
    description: "Top up your phone instantly",
    href: "/utilityBills",
  },
  {
    icon: Sparkles,
    iconColor: "text-green-500",
    iconBg: "bg-green-500/10",
    title: "Claim Free Airtime",
    description: "Get free top-ups and rewards",
    href: "/freebies",
  },
  {
    icon: Star,
    iconColor: "text-yellow-500",
    iconBg: "bg-yellow-500/10",
    title: "Beta Features",
    description: "Group savings & smart vaults",
    href: "/betaFeatures",
  },
];

const Esusu: React.FC = () => {
  const router = useRouter();

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-8 pb-24">

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-6 mb-8"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3 px-0.5">
          Quick Actions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.07 }}
              >
                <Card
                  onClick={() => router.push(action.href)}
                  className="cursor-pointer group border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-200 hover:shadow-sm"
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={cn("rounded-xl p-2.5 shrink-0", action.iconBg)}>
                      <Icon className={cn("h-5 w-5", action.iconColor)} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {action.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 ml-auto shrink-0" />
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Tabbed Content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-xs"> 
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
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
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mt-8"
      >
        <Card className="border border-primary/15 dark:border-primary/20 bg-white dark:bg-neutral-900 overflow-hidden shadow-none">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row items-center">

              {/* Text side */}
              <div className="flex-1 p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <SmartphoneIcon className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Mobile App
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Esusu on your phone
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-sm">
                  Manage savings, join groups, and track finances on the go.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="default" className="gap-2 h-9 text-xs font-medium">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    App Store
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2 h-9 text-xs font-medium border-gray-200 dark:border-neutral-700">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M3.18 23.76c.2.1.43.14.67.09l12.09-6.98-2.56-2.56-10.2 9.45zm-1.3-19.7a1.5 1.5 0 0 0-.38 1.02v15.84c0 .4.14.75.38 1.02l.06.06 8.87-8.87v-.21L1.82 4.0l-.06.06zM20.35 10.6l-2.5-1.44-2.85 2.84 2.85 2.84 2.52-1.45c.72-.41.72-1.08 0-1.49l-.02-.3zm-18.05 9.5l10.18-5.88-2.56-2.56L1.88 19.6l.42.5z"/>
                    </svg>
                    Play Store
                  </Button>
                </div>
              </div>

              {/* Logo side */}
              <div className="sm:pr-8 pb-6 sm:pb-0 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-110" />
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/10 flex items-center justify-center">
                    <Image
                      src="/esusu.png"
                      priority
                      alt="Esusu App"
                      width={72}
                      height={72}
                      className="relative z-10 drop-shadow-sm"
                    />
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Esusu;