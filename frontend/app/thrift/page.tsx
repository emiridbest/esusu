"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UsersIcon, CalendarIcon, BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Thrift: React.FC = () => {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 pt-10 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center text-center"
      >
        <div className="mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-full bg-primary/10 animate-pulse blur-xl"></div>
            <div className="relative bg-white dark:bg-gray-800 p-5 rounded-full border border-gray-100 dark:border-gray-700">
              <UsersIcon className="h-12 w-12 text-primary" />
            </div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6"
        >
          <Badge variant="outline" className="px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20">
            Beta Feature
          </Badge>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
        >
          Community Thrift Groups
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10"
        >
          Join or create savings groups with friends and family. Pool your resources together and take turns receiving the collected funds.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <Button 
            onClick={() => router.push('/miniSafe')}
            className="rounded-full"
          >
            Try Simple Savings
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => {}}
            className="rounded-full flex items-center gap-2 border-primary text-primary hover:bg-primary/10"
          >
            <BellIcon className="h-4 w-4" />
            Get Notified When Ready
          </Button>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-4xl"
        >
          <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-gray-100 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <circle cx="12" cy="8" r="5" />
                    <path d="M20 21a8 8 0 1 0-16 0" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Create Groups</h3>
                <p className="text-gray-600 dark:text-gray-400">Start a thrift group with friends, family or colleagues</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-gray-100 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Regular Contributions</h3>
                <p className="text-gray-600 dark:text-gray-400">Make consistent payments into your group pool</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-gray-100 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M12 2v20" />
                    <path d="m17 5-5-3-5 3" />
                    <path d="m17 19-5 3-5-3" />
                    <path d="M2 12h20" />
                    <path d="m5 7-3 5 3 5" />
                    <path d="m19 7 3 5-3 5" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Take Turns</h3>
                <p className="text-gray-600 dark:text-gray-400">Each member receives the full pool amount on rotation</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="mt-16"
        >
          <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-primary/20 border max-w-3xl mx-auto">
            <CardContent className="pt-6">
              <div className="bg-primary/5 -mt-6 -mx-6 px-6 py-4 rounded-t-lg border-b border-primary/10 mb-6">
                <h3 className="font-medium text-lg text-gray-900 dark:text-white">Coming Soon Features</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Smart Contracts</h4>
                    <p className="text-gray-600 dark:text-gray-400">Trustless operation with blockchain-powered smart contracts</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Automated Payouts</h4>
                    <p className="text-gray-600 dark:text-gray-400">Scheduled distributions to ensure everyone gets paid on time</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Reputation System</h4>
                    <p className="text-gray-600 dark:text-gray-400">Build trust with a transparent reputation score based on participation</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-gray-100 dark:border-gray-700 flex justify-center">
              <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span>Expected launch: Q3 2025</span>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Thrift;