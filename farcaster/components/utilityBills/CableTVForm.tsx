"use client";
import React, { useState, useEffect } from 'react';
import DualCurrencyPrice from '../../components/DualCurrencyPrice';
import { parseAmount } from '../../utils/currency';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "../../components/ui/button";
import { useUtility } from '../../context/utilityProvider/UtilityContext';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { useToast } from "../../hooks/use-toast"
import { Loader2 } from "lucide-react";
import CountrySelector from './CountrySelector';
import { TOKENS } from '../../context/utilityProvider/tokens';
import { 
  fetchCableProviders, 
  fetchCablePackages, 
  verifySubscriberID,
  type CableProvider,
  type CablePackage
} from '../../services/utility/utilityServices';

const formSchema = z.object({
  country: z.string({
    required_error: "Please select a country.",
  }),
  subscriberId: z.string().min(5, {
    message: "Subscriber ID must be at least 5 characters.",
  }),
  provider: z.string({
    required_error: "Please select a provider.",
  }),
  plan: z.string({
    required_error: "Please select a subscription plan.",
  }),
  paymentToken: z.string({
    required_error: "Please select a payment token.",
  }),
});

export default function CableTVForm() {
  const { toast } = useToast();
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<CableProvider[]>([]);
  const [availablePlans, setAvailablePlans] = useState<CablePackage[]>([]);
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
      country: "", 
      subscriberId: "",
      provider: "",
      plan: "",
      paymentToken: "cusd",
    },
  });
  
  const watchCountry = form.watch("country");
  const watchProvider = form.watch("provider");
  const watchPlan = form.watch("plan");
  const watchPaymentToken = form.watch("paymentToken");

  // Fetch cable TV providers when country changes
  useEffect(() => {
    const getProviders = async () => {
      if (watchCountry) {
        setIsLoading(true);
        form.setValue("provider", "");
        form.setValue("plan", "");
        
        try {
          const CableProviders = await fetchCableProviders(watchCountry);
          setProviders(CableProviders);
        } catch (error) {
          console.error("Error fetching cable TV providers:", error);
          toast({
            title: "Error",
            description: "Failed to load cable TV providers. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    getProviders();
  }, [watchCountry, form, toast]);

  // Fetch subscription plans when provider changes
  useEffect(() => {
    const getPlans = async () => {
      if (watchProvider && watchCountry) {
        setIsLoading(true);
        form.setValue("plan", "");
        
        try {
          const plans = await fetchCablePackages(watchProvider, watchCountry);
          setAvailablePlans(plans);
        } catch (error) {
          console.error("Error fetching cable TV plans:", error);
          toast({
            title: "Error",
            description: "Failed to load subscription plans. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        setAvailablePlans([]);
      }
    };
    
    getPlans();
  }, [watchProvider, watchCountry, form, toast]);

  // Update price when plan changes
  useEffect(() => {
    if (watchPlan) {
      const selectedPlan = availablePlans.find(plan => plan.id === watchPlan);
      if (selectedPlan) {
        // Parse the price string to get the numeric value
        const priceValue = selectedPlan.price.replace(/[^0-9.]/g, '');
        setSelectedPrice(parseAmount(priceValue));
      } else {
        setSelectedPrice(0);
      }
    } else {
      setSelectedPrice(0);
    }
  }, [watchPlan, availablePlans]);

  useEffect(() => {
    setSelectedToken(watchPaymentToken);
  }, [watchPaymentToken, setSelectedToken]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsProcessing(true);
    
    try {
      // First verify the subscriber ID with the selected provider
      const verificationResult = await verifySubscriberID(
        values.subscriberId, 
        values.provider,
        values.country
      );
      
      if (!verificationResult.verified) {
        throw new Error(verificationResult.message || 'Subscriber ID verification failed');
      }
      
      const selectedPlan = availablePlans.find(plan => plan.id === values.plan);
      const providerName = providers.find(p => p.id === values.provider)?.name || '';
      
      const success = await handleTransaction({
        type: 'cable',
        amount: selectedPrice.toString(),
        token: values.paymentToken,
        recipient: values.subscriberId,
        metadata: {
          countryCode: values.country,
          providerId: values.provider,
          planId: values.plan,
          planName: selectedPlan?.name || '',
          provider: providerName
        }
      });

      if (success) {
        toast({
          title: "Payment Successful",
          description: `Your cable TV subscription for ${values.subscriberId} was successful.`,
        });
        
        // Reset the form but keep the country
        form.reset({
          ...form.getValues(),
          subscriberId: "",
          provider: "",
          plan: "",
        });
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
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <CountrySelector 
                  value={field.value} 
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Select the country for the cable TV service.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subscriberId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscriber ID / Smart Card Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter subscriber ID" {...field} />
              </FormControl>
              <FormDescription>
                Enter your subscriber ID or smart card number.
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
              <FormLabel>Cable TV Provider</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || providers.length === 0}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cable TV provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoading && <div className="text-sm text-gray-500 mt-1 flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading providers...
              </div>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscription Plan</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value} 
                disabled={isLoading || !watchProvider || availablePlans.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subscription plan" />
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
              {isLoading && <div className="text-sm text-gray-500 mt-1 flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading plans...
              </div>}
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
                value={field.value}
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
                  amount={selectedPrice}
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