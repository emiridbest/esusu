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
    pinCode?: string; // PIN code for DingConnect ReadReceipt products
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
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/30 via-yellow-100/10 to-yellow-200/20 dark:from-yellow-900/20 dark:via-yellow-800/10 dark:to-yellow-900/20 rounded-2xl blur-3xl"></div>

          <div className="relative bg-white dark:bg-black backdrop-blur-xl rounded-2xl border border-yellow-200/50 dark:border-yellow-700/50 shadow-xl">
            {/* Success Header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-100/30 to-yellow-50/30 dark:from-yellow-900/20 dark:to-yellow-800/20"></div>

              <DialogHeader className="relative px-8 py-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, type: "spring", bounce: 0.6 }}
                  className="flex justify-center mb-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-yellow-300/30 dark:bg-yellow-600/30 animate-pulse blur-xl"></div>
                    <div className="relative rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 p-6 shadow-lg">
                      <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400 drop-shadow-sm" />
                    </div>
                    <div className="absolute -top-1 -right-1">
                      <SparklesIcon className="h-6 w-6 text-yellow-500 dark:text-yellow-400 animate-pulse" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <DialogTitle className="text-3xl font-bold text-black dark:text-white mb-2">
                    Payment Successful!
                  </DialogTitle>
                  <DialogDescription className="text-gray-700 dark:text-gray-300 text-lg">
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
              <div className="bg-gray-50 dark:bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-yellow-200/40 dark:border-yellow-700/40 shadow-inner">
                <div className="space-y-4">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</span>
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400">{getPaymentTypeLabel()}</span>
                  </motion.div>

                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.55, duration: 0.3 }}
                    className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount</span>
                    <span className="font-bold text-2xl text-yellow-600 dark:text-yellow-400">
                      {paymentDetails.amount} {paymentDetails.currency}
                    </span>
                  </motion.div>

                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                    className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {paymentDetails.type === 'electricity' ? 'Meter Number' : 'Phone Number'}
                    </span>
                    <span className="font-semibold text-black dark:text-white">{paymentDetails.recipient}</span>
                  </motion.div>

                  {paymentDetails.provider && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.65, duration: 0.3 }}
                      className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Provider</span>
                      <span className="font-semibold text-black dark:text-white">{paymentDetails.provider}</span>
                    </motion.div>
                  )}

                  {/* PIN Code Display - Prominent styling for voucher products */}
                  {paymentDetails.pinCode && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.68, duration: 0.3 }}
                      className="py-4 my-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-300 dark:border-yellow-600"
                    >
                      <div className="text-center">
                        <span className="text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-300">Your Top-up PIN</span>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <span className="font-mono text-2xl font-bold text-yellow-600 dark:text-yellow-400 tracking-widest">
                            {paymentDetails.pinCode}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(paymentDetails.pinCode!, 'PIN Code')}
                            className="h-8 w-8 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:text-yellow-600 dark:hover:text-yellow-400"
                          >
                            <Copy className="h-5 w-5" />
                          </Button>
                        </div>
                        <p className="text-xs text-yellow-700/80 dark:text-yellow-300/80 mt-2">Dial *126*PIN# to redeem</p>
                      </div>
                    </motion.div>
                  )}

                  {paymentDetails.token && (
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.7, duration: 0.3 }}
                      className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Token</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-lg border border-yellow-300 dark:border-yellow-600 text-black dark:text-white">
                          {paymentDetails.token}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(paymentDetails.token!, 'Token')}
                          className="h-8 w-8 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:text-yellow-600 dark:hover:text-yellow-400"
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
                      className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Units</span>
                      <span className="font-semibold text-black dark:text-white">{paymentDetails.units}</span>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.3 }}
                    className="flex justify-between items-center py-2"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction Hash</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                        {paymentDetails.transactionHash.substring(0, 10)}...
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(paymentDetails.transactionHash, 'Transaction hash')}
                        className="h-8 w-8 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:text-yellow-600 dark:hover:text-yellow-400"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={viewTransaction}
                        className="h-8 w-8 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:text-yellow-600 dark:hover:text-yellow-400"
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
                className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-300 dark:border-yellow-700"
              >
                <div className="flex items-center justify-center gap-8 text-sm mb-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.0, duration: 0.3 }}
                    className="flex items-center gap-2"
                  >
                    <div className="p-2 bg-yellow-200 dark:bg-yellow-800 rounded-full">
                      <Receipt className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
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
                        paymentDetails.emailSent ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-200 dark:bg-gray-800"
                      )}>
                        <Mail className={cn(
                          "h-4 w-4",
                          paymentDetails.emailSent ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
                        )} />
                      </div>
                      <span className={cn(
                        "font-medium",
                        paymentDetails.emailSent ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
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
                        paymentDetails.smsSent ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-200 dark:bg-gray-800"
                      )}>
                        <MessageSquare className={cn(
                          "h-4 w-4",
                          paymentDetails.smsSent ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
                        )} />
                      </div>
                      <span className={cn(
                        "font-medium",
                        paymentDetails.smsSent ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
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
                  className="text-xs text-center text-gray-600 dark:text-gray-400 mt-2"
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
                  className="flex-1 h-12 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 font-semibold hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-all duration-300"
                  onClick={viewTransaction}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
                <Button
                  className="flex-1 h-12 bg-yellow-500 dark:bg-yellow-600 text-black dark:text-white hover:bg-yellow-600 dark:hover:bg-yellow-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] font-semibold"
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
