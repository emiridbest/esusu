"use client";

import React, { useState, useEffect } from 'react';
import DualCurrencyPrice from '../DualCurrencyPrice';
import { parseAmount } from '../../utils/currency';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useUtility } from '../../context/utilityProvider/UtilityContext';
import { CABLE_PROVIDERS } from '../../context/utilityProvider/cable';
import { TOKENS } from '../../context/utilityProvider/tokens';
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { useToast } from "../../hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  smartCardNumber: z.string().min(1, {
    message: "Smart card number is required.",
  }),
  provider: z.string({
    required_error: "Please select a cable provider.",
  }),
  package: z.string({
    required_error: "Please select a subscription package.",
  }),
  paymentToken: z.string({
    required_error: "Please select a payment token.",
  }),
});

export default function CableSubscriptionForm() {
  const { toast } = useToast();
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  
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
      smartCardNumber: "",
      provider: "",
      package: "",
      paymentToken: "cusd",
    },
  });

  const watchProvider = form.watch("provider");
  const watchPackage = form.watch("package");
  const watchPaymentToken = form.watch("paymentToken");

  useEffect(() => {
    if (watchProvider) {
      const provider = CABLE_PROVIDERS.find(p => p.id === watchProvider);
      if (provider && provider.plans) {
        const packages = provider.plans.map(plan => ({
          id: plan.plan.toLowerCase().replace(/\s+/g, '_'),
          name: plan.plan,
          price: plan.price,
          validity: plan.validity
        }));
        setAvailablePackages(packages);
      } else {
        setAvailablePackages([]);
      }
      form.setValue("package", "");
    }
  }, [watchProvider, form]);

  // Update price when package changes
  useEffect(() => {
    if (watchPackage && watchProvider) {
      const provider = CABLE_PROVIDERS.find(p => p.id === watchProvider);
      const selectedPlan = provider?.plans.find(plan => 
        plan.plan.toLowerCase().replace(/\s+/g, '_') === watchPackage
      );
      setSelectedPrice(selectedPlan ? parseAmount(selectedPlan.price) : 0);
    } else {
      setSelectedPrice(0);
    }
  }, [watchPackage, watchProvider]);

  // Update selected token
  useEffect(() => {
    setSelectedToken(watchPaymentToken);
  }, [watchPaymentToken, setSelectedToken]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsProcessing(true);
    
    try {
      const selectedPackage = CABLE_PROVIDERS.find((pkg: { id: string; }) => pkg.id === values.package);
      const providerName = CABLE_PROVIDERS.find(provider => provider.id === values.provider)?.name || '';
      
      const success = await handleTransaction({
        type: 'cable',
        amount: selectedPrice.toString(),
        token: values.paymentToken,
        recipient: values.smartCardNumber,
        metadata: {
          providerId: values.provider,
          packageId: values.package,
          packageName: selectedPackage?.name || '',
          provider: providerName
        }
      });

      if (success) {
        toast({
          title: "Payment Successful",
          description: `Your cable subscription for ${values.smartCardNumber} was successful.`,
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
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="smartCardNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Smart Card Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter smart card number" {...field} />
              </FormControl>
              <FormDescription>
                Enter your smart card number or IUC number.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cable Provider</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cable provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CABLE_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
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
          name="package"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscription Package</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!watchProvider}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subscription package" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availablePackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} - {pkg.price}
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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