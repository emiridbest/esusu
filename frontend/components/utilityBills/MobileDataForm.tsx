"use client";
import React, { useState, useEffect } from 'react';
import DualCurrencyPrice from '@/components/DualCurrencyPrice';
import { parseAmount } from '@/utils/currency';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { networks, dataPlans } from '@/context/utilityProvider/mobileData';
import { Button } from "@/components/ui/button";
import { useUtility } from '@/context/utilityProvider/UtilityContext';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react";

import { TOKENS } from '@/context/utilityProvider/tokens';

const formSchema = z.object({
  phoneNumber: z.string().min(11, {
    message: "Phone number must be at least 11 digits.",
  }),
  network: z.string({
    required_error: "Please select a network provider.",
  }),
  plan: z.string({
    required_error: "Please select a data plan.",
  }),
  paymentToken: z.string({
    required_error: "Please select a payment token.",
  }),
});

export default function MobileDataForm() {
  const { toast } = useToast();
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const { 
    selectedToken, 
    setSelectedToken, 
    isProcessing,
    setIsProcessing, 
    handleTransaction 
  } = useUtility();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phoneNumber: "",
      network: "",
      plan: "",
      paymentToken: "cusd",
    },
  });
  const watchNetwork = form.watch("network");
  const watchPlan = form.watch("plan");
  const watchPaymentToken = form.watch("paymentToken");

  // Update available plans when network changes
  useEffect(() => {
    if (watchNetwork) {
      setAvailablePlans(dataPlans.filter(plan => plan.network === watchNetwork));
      form.setValue("plan", "");
    }
  }, [watchNetwork, form]);

  // Update price when plan changes
  useEffect(() => {
    if (watchPlan) {
      const selectedPlan = dataPlans.find(plan => plan.id === watchPlan);
      setSelectedPrice(selectedPlan ? parseAmount(selectedPlan.price) : 0);
    } else {
      setSelectedPrice(0);
    }
  }, [watchPlan]);

  useEffect(() => {
    setSelectedToken(watchPaymentToken);
  }, [watchPaymentToken, setSelectedToken]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsProcessing(true);
    
    try {
      const selectedPlan = dataPlans.find(plan => plan.id === values.plan);
      const networkName = networks.find(net => net.id === values.network)?.name || '';
      
      const success = await handleTransaction({
        type: 'data',
        amount: selectedPrice.toString(),
        token: values.paymentToken,
        recipient: values.phoneNumber,
        metadata: {
          networkId: values.network,
          planId: values.plan,
          planName: selectedPlan?.name || '',
          network: networkName
        }
      });

      if (success) {
        toast({
          title: "Payment Successful",
          description: `Your mobile data purchase for ${values.phoneNumber} was successful.`,
        });
        
        // Reset the form
        form.reset();
        setSelectedPrice(0);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter phone number" {...field} />
              </FormControl>
              <FormDescription>
                Enter the phone number to recharge.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="network"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Network Provider</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {networks.map((network) => (
                    <SelectItem key={network.id} value={network.id}>
                      {network.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Plan</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!watchNetwork}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select data plan" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availablePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentToken"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Token</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment token" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TOKENS.map((token) => (
                    <SelectItem key={token.id} value={token.id}>
                      {token.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                All token amounts are converted to USD equivalent
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedPrice > 0 && (
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <CardContent className="pt-4">
              <div className="flex flex-col space-y-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Payment Amount:
                </div>
                <DualCurrencyPrice
                  amountNGN={selectedPrice}
                  stablecoin={selectedToken}
                  showTotal={true}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isProcessing || !selectedPrice}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay with ${selectedToken}`
          )}
        </Button>
      </form>
    </Form>
  );
}
