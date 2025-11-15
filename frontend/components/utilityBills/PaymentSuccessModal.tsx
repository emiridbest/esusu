"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Mail, MessageSquare, Receipt, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">Payment Successful!</DialogTitle>
          <DialogDescription className="text-center">
            Your {getPaymentTypeLabel().toLowerCase()} has been processed successfully
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Payment Details */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
              <span className="font-medium">{getPaymentTypeLabel()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Amount</span>
              <span className="font-medium text-lg">{paymentDetails.amount} {paymentDetails.currency}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {paymentDetails.type === 'electricity' ? 'Meter Number' : 'Phone Number'}
              </span>
              <span className="font-medium">{paymentDetails.recipient}</span>
            </div>

            {paymentDetails.provider && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Provider</span>
                <span className="font-medium">{paymentDetails.provider}</span>
              </div>
            )}

            {paymentDetails.token && (
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Token</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded">
                    {paymentDetails.token}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(paymentDetails.token!, 'Token')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {paymentDetails.units && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Units</span>
                <span className="font-medium">{paymentDetails.units}</span>
              </div>
            )}

            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Transaction Hash</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-500">
                  {paymentDetails.transactionHash.substring(0, 10)}...
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(paymentDetails.transactionHash, 'Transaction hash')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={viewTransaction}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Receipt Status */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <span className="text-gray-600 dark:text-gray-400">Receipt</span>
              </div>
              
              {paymentDetails.emailSent !== false && (
                <div className="flex items-center gap-2">
                  <Mail className={`h-4 w-4 ${paymentDetails.emailSent ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="text-gray-600 dark:text-gray-400">
                    {paymentDetails.emailSent ? 'Email Sent ✓' : 'Email Pending'}
                  </span>
                </div>
              )}
              
              {paymentDetails.smsSent !== false && (
                <div className="flex items-center gap-2">
                  <MessageSquare className={`h-4 w-4 ${paymentDetails.smsSent ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="text-gray-600 dark:text-gray-400">
                    {paymentDetails.smsSent ? 'SMS Sent ✓' : 'SMS Pending'}
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-xs text-center text-gray-500 mt-2">
              A detailed receipt has been sent to your email and phone
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={viewTransaction}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Explorer
            </Button>
            <Button
              className="flex-1"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
