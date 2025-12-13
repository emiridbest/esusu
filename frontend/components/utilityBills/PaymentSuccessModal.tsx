"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Mail, MessageSquare, Receipt, Copy, ExternalLink, SparklesIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PaymentSuccessModalProps {
  open: boolean;
  onClose: () => void;
  paymentDetails: {
    type: 'electricity' | 'airtime' | 'data';
    amount: string;
    currency: string;
    recipient: string;
    transactionHash: string;
    token?: string;
    units?: string;
    provider?: string;
    emailSent?: boolean;
    smsSent?: boolean;
  };
}

export function PaymentSuccessModal({ open, onClose, paymentDetails }: PaymentSuccessModalProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getPaymentTypeLabel = () => {
    switch (paymentDetails.type) {
      case 'electricity':
        return 'Electricity Bill Payment';
      case 'airtime':
        return 'Airtime Purchase';
      case 'data':
        return 'Data Bundle Purchase';
      default:
        return 'Payment';
    }
  };

  const viewTransaction = () => {
    window.open(`https://celoscan.io/tx/${paymentDetails.transactionHash}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none bg-transparent shadow-2xl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative"
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-green-500/20 rounded-2xl blur-3xl"></div>
          
          <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-xl">
            {/* Success Header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-yellow-500/10"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5"></div>
              
              <DialogHeader className="relative px-8 py-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, type: "spring", bounce: 0.6 }}
                  className="flex justify-center mb-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse blur-xl"></div>
                    <div className="relative rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 p-6 shadow-lg">
                      <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400 drop-shadow-sm" />
                    </div>
                    <div className="absolute -top-1 -right-1">
                      <SparklesIcon className="h-6 w-6 text-primary animate-pulse" />
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-yellow-600 bg-clip-text text-transparent mb-2">
                    Payment Successful!
                  </DialogTitle>
                  <DialogDescription className="text-gray-600 dark:text-gray-300 text-lg">
                    Your {getPaymentTypeLabel().toLowerCase()} has been processed successfully
                  </DialogDescription>
                </motion.div>
              </DialogHeader>
            </div>

            {/* Payment Details */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="px-8 pb-6"
            >
              <div className="bg-gradient-to-br from-gray-50/80 to-white/80 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-inner">
                <div className="space-y-4">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700"
                  >
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Type</span>
                    <span className="font-semibold text-primary">{getPaymentTypeLabel()}</span>
                  </motion.div>
                  
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.55, duration: 0.3 }}
                    className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700"
                  >
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Amount</span>
                    <span className="font-bold text-2xl bg-gradient-to-r from-primary to-yellow-600 bg-clip-text text-transparent">
                      {paymentDetails.amount} {paymentDetails.currency}
                    </span>
                  </motion.div>

                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                    className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700"
                  >
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {paymentDetails.type === 'electricity' ? 'Meter Number' : 'Phone Number'}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{paymentDetails.recipient}</span>
                  </motion.div>

                  {paymentDetails.provider && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.65, duration: 0.3 }}
                      className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700"
                    >
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Provider</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{paymentDetails.provider}</span>
                    </motion.div>
                  )}

                  {paymentDetails.token && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.7, duration: 0.3 }}
                      className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700"
                    >
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Token</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-primary/10 dark:bg-primary/20 px-3 py-1 rounded-lg border border-primary/20">
                          {paymentDetails.token}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(paymentDetails.token!, 'Token')}
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {paymentDetails.units && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.75, duration: 0.3 }}
                      className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700"
                    >
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Units</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{paymentDetails.units}</span>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.3 }}
                    className="flex justify-between items-center py-2"
                  >
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Transaction Hash</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                        {paymentDetails.transactionHash.substring(0, 10)}...
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(paymentDetails.transactionHash, 'Transaction hash')}
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={viewTransaction}
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Receipt Status */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.4 }}
                className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-yellow-500/5 rounded-xl border border-primary/10"
              >
                <div className="flex items-center justify-center gap-8 text-sm mb-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.0, duration: 0.3 }}
                    className="flex items-center gap-2"
                  >
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Receipt className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Receipt</span>
                  </motion.div>
                  
                  {paymentDetails.emailSent !== false && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.1, duration: 0.3 }}
                      className="flex items-center gap-2"
                    >
                      <div className={cn(
                        "p-2 rounded-full",
                        paymentDetails.emailSent ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"
                      )}>
                        <Mail className={cn(
                          "h-4 w-4",
                          paymentDetails.emailSent ? "text-green-600 dark:text-green-400" : "text-gray-400"
                        )} />
                      </div>
                      <span className={cn(
                        "font-medium",
                        paymentDetails.emailSent ? "text-green-600 dark:text-green-400" : "text-gray-400"
                      )}>
                        {paymentDetails.emailSent ? 'Email Sent ✓' : 'Email Pending'}
                      </span>
                    </motion.div>
                  )}
                  
                  {paymentDetails.smsSent !== false && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.2, duration: 0.3 }}
                      className="flex items-center gap-2"
                    >
                      <div className={cn(
                        "p-2 rounded-full",
                        paymentDetails.smsSent ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"
                      )}>
                        <MessageSquare className={cn(
                          "h-4 w-4",
                          paymentDetails.smsSent ? "text-green-600 dark:text-green-400" : "text-gray-400"
                        )} />
                      </div>
                      <span className={cn(
                        "font-medium",
                        paymentDetails.smsSent ? "text-green-600 dark:text-green-400" : "text-gray-400"
                      )}>
                        {paymentDetails.smsSent ? 'SMS Sent ✓' : 'SMS Pending'}
                      </span>
                    </motion.div>
                  )}
                </div>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.3, duration: 0.4 }}
                  className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2"
                >
                  A detailed receipt has been sent to your email and phone
                </motion.p>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.4 }}
                className="flex gap-3 mt-6"
              >
                <Button
                  variant="outline"
                  className="flex-1 h-12 bg-primary/20 border-primary/60 text-primary font-semibold hover:bg-primary/30 hover:border-primary/80 transition-all duration-300"
                  onClick={viewTransaction}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
                <Button
                  className="flex-1 h-12 bg-gradient-to-r from-primary to-yellow-600 hover:from-primary/90 hover:to-yellow-600/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  onClick={onClose}
                >
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    Done
                  </motion.span>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
