"use client";
import React from "react";
import { Switch } from "@/components/ui/switch";
import { useBetaFeatures } from "@/context/BetaFeaturesContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FlaskConicalIcon, LockIcon, ShieldIcon, ZapIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const Thrift = dynamic(() => import("@/app/thrift/page"), { ssr: false });
const MiniSafe = dynamic(() => import("@/app/miniSafe/page"), { ssr: false });

export default function BetaFeaturesToggle() {
  const { enabled, setEnabled } = useBetaFeatures();

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 dark:from-primary/10 dark:to-primary/5 p-6">
        {/* Decorative background circle */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/5 dark:bg-primary/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="mt-1 rounded-xl bg-primary/10 p-2.5 shrink-0">
              <FlaskConicalIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Beta Features
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                  <ZapIcon className="h-3 w-3" /> Beta
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                Early access to beta features. These may change without notice.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:shrink-0">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
      </div>

      {/* Content area */}
      <AnimatePresence mode="wait">
        {enabled ? (
          <motion.div
            key="enabled"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <Tabs defaultValue="thrift" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-xs">
                <TabsTrigger value="thrift" className="flex items-center gap-1.5">
                  <ShieldIcon className="h-3.5 w-3.5" />
                  Group Savings
                </TabsTrigger>
                <TabsTrigger value="miniSafe" className="flex items-center gap-1.5">
                  <LockIcon className="h-3.5 w-3.5" />
                  MiniSafe
                </TabsTrigger>
              </TabsList>

              <TabsContent value="thrift" className="mt-4 focus-visible:outline-none">
                <Thrift />
              </TabsContent>
              <TabsContent value="miniSafe" className="mt-4 focus-visible:outline-none">
                <MiniSafe />
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          <motion.div
            key="disabled"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center py-16 gap-3 text-center"
          >
            <div className="rounded-full bg-gray-100 dark:bg-neutral-800 p-4 mb-1">
              <LockIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="font-medium text-gray-700 dark:text-gray-300 text-sm">Features are locked</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
              Toggle the switch above to unlock Group Savings and MiniSafe.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}