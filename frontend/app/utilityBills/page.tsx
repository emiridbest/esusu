"use client";
import React from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { RocketIcon, BellIcon, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const UtilityBills: React.FC = () => {
  const router = useRouter();

  return (
    <div className="max-w-screen-xl mx-auto px-4 pt-10 pb-20">
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
            transition={{ 
              duration: 0.5,
              delay: 0.2,
              type: "spring",
              stiffness: 200
            }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-full bg-primary/10 animate-pulse blur-xl"></div>
            <div className="relative bg-white dark:bg-gray-800 p-5 rounded-full border border-gray-100 dark:border-gray-700">
              <RocketIcon className="h-12 w-12 text-primary" />
            </div>
          </motion.div>
        </div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
        >
          Utility Bill Payments <span className="text-primary">Coming Soon</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10"
        >
          We are working on bringing you seamless utility bill payments directly from your wallet. Stay tuned for updates!
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <Button 
            onClick={() => router.push('/')}
            className="rounded-full"
          >
            Return to Home
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => {}}
            className="rounded-full flex items-center gap-2 border-primary text-primary hover:bg-primary/10"
          >
            <BellIcon className="h-4 w-4" />
            Get Notified
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
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Simple Payments</h3>
                <p className="text-gray-600 dark:text-gray-400">Pay your bills with just a few clicks using your crypto wallet</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-gray-100 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Auto Payments</h3>
                <p className="text-gray-600 dark:text-gray-400">Schedule recurring payments and never miss a due date</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-gray-100 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Secure Transactions</h3>
                <p className="text-gray-600 dark:text-gray-400">End-to-end encrypted payments with blockchain verification</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="mt-16 flex items-center text-gray-400 dark:text-gray-500"
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          <span>Expected launch: Q3 2025</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default UtilityBills;