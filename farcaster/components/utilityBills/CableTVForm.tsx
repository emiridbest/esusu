"use client";
import React, { useState, useEffect, useContext, createContext } from 'react';
import DualCurrencyPrice from './DualCurrencyPrice';
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
  const [selectedToken, setSelectedToken] = useState<string | undefined>(undefined);  
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<CableProvider[]>([]);
  const [availablePlans, setAvailablePlans] = useState<CablePackage[]>([]);
  const [countryCurrency, setCountryCurrency] = useState<string>(""); 
  const { 
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
      paymentToken: "",
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
        setSelectedPrice(Number(priceValue));
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
  <div className="bg-gradient-to-br from-white via-black-50 to-primary-50 dark:from-black dark:via-black-0 dark:to-black p-6 rounded-xl border border-primary-400/20 dark:border-primary-400/30">
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-800 dark:text-primary/90 font-medium text-sm">Country</FormLabel>
              <FormControl>
                <div className="relative">
                  <CountrySelector
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val);
                      if (val) setCountryCurrency(val);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 dark:from-yellow-400/10 to-transparent pointer-events-none rounded-lg"></div>
                </div>
              </FormControl>
              <FormDescription className="text-xs text-gray-600 dark:text-gray-300">
                Select the country for the cable TV service.
              </FormDescription>
              <FormMessage className="text-red-600 dark:text-yellow-300" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subscriberId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-800 dark:text-primary/90 font-medium text-sm">Subscriber ID / Smart Card Number</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter subscriber ID" 
                  {...field} 
                  className="text-xs bg-white dark:bg-gray-800 border-2 border-yellow-400/50 dark:border-yellow-400/30 hover:border-yellow-500 dark:hover:border-yellow-400 focus:border-yellow-500 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-white transition-all duration-200"
                />
              </FormControl>
              <FormDescription className="text-xs text-gray-600 dark:text-gray-300">
                Enter your subscriber ID or smart card number.
              </FormDescription>
              <FormMessage className="text-red-600 dark:text-yellow-300" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-800 dark:text-primary/90 font-medium text-sm">Cable TV Provider</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || providers.length === 0}>
                <FormControl>
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-2 border-yellow-400/50 dark:border-yellow-400/30 hover:border-yellow-500 dark:hover:border-yellow-400 focus:border-yellow-500 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 transition-all duration-200 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select cable TV provider" className="text-xs" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-white dark:bg-gray-800 border-2 border-yellow-400/30 dark:border-yellow-400/40">
                  {providers.map((provider) => (
                    <SelectItem 
                      key={provider.id} 
                      value={provider.id}
                      className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20 focus:bg-yellow-100 dark:focus:bg-yellow-800/30 text-gray-800 dark:text-gray-200"
                    >
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoading && <div className="text-sm text-gray-600 dark:text-yellow-300 mt-1 flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-1 text-yellow-500 dark:text-primary/90" /> Loading providers...
              </div>}
              <FormMessage className="text-red-600 dark:text-yellow-300" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-800 dark:text-primary/90 font-medium text-sm">Subscription Plan</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value} 
                disabled={isLoading || !watchProvider || availablePlans.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-2 border-yellow-400/50 dark:border-yellow-400/30 hover:border-yellow-500 dark:hover:border-yellow-400 focus:border-yellow-500 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 transition-all duration-200 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select subscription plan" className="text-xs" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-white dark:bg-gray-800 border-2 border-yellow-400/30 dark:border-yellow-400/40">
                  {availablePlans.map((plan) => (
                    <SelectItem 
                      key={plan.id} 
                      value={plan.id}
                      className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20 focus:bg-yellow-100 dark:focus:bg-yellow-800/30 text-gray-800 dark:text-gray-200"
                    >
                      {plan.name} - {plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isLoading && <div className="text-sm text-gray-600 dark:text-yellow-300 mt-1 flex items-center">
                <Loader2 className="h-3 w-3 animate-spin mr-1 text-yellow-500 dark:text-primary/90" /> Loading plans...
              </div>}
              <FormMessage className="text-red-600 dark:text-yellow-300" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentToken"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-800 dark:text-primary/90 font-medium text-sm">Payment Token</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-2 border-yellow-400/50 dark:border-yellow-400/30 hover:border-yellow-500 dark:hover:border-yellow-400 focus:border-yellow-500 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 transition-all duration-200 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select payment token" className="text-xs" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-white dark:bg-gray-800 border-2 border-yellow-400/30 dark:border-yellow-400/40">
                  {TOKENS.map((token) => (
                    <SelectItem 
                      key={token.id} 
                      value={token.id}
                      className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20 focus:bg-yellow-100 dark:focus:bg-yellow-800/30 text-gray-800 dark:text-gray-200"
                    >
                      {token.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-xs text-gray-600 dark:text-gray-300">
                All token amounts are converted to USD equivalent
              </FormDescription>
              <FormMessage className="text-red-600 dark:text-yellow-300" />
            </FormItem>
          )}
        />

        {selectedPrice > 0 && (
          <Card className="bg-gradient-to-r from-yellow-100 via-yellow-200 to-yellow-100 dark:from-yellow-400 dark:via-yellow-300 dark:to-yellow-400 border-2 border-yellow-300 dark:border-0 shadow-lg shadow-yellow-400/20 dark:shadow-yellow-400/30">
            <CardContent className="pt-4">
              <div className="flex flex-col space-y-1">
                <div className="text-sm font-medium text-gray-800 dark:text-black">
                  Payment Amount:
                </div>
                <div className="text-gray-900 dark:text-black font-medium">
                  <DualCurrencyPrice
                    amount={selectedPrice}
                    stablecoin={selectedToken}
                    showTotal={true}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-500 dark:from-yellow-400 dark:via-yellow-500 dark:to-yellow-400 dark:hover:from-yellow-500 dark:hover:via-yellow-600 dark:hover:to-yellow-500 text-black font-medium py-3 shadow-lg shadow-yellow-400/30 dark:shadow-yellow-400/40 border-0 transition-all duration-200 hover:shadow-xl hover:shadow-yellow-400/40 dark:hover:shadow-yellow-400/50 transform hover:-translate-y-0.5"
          disabled={isProcessing || !selectedPrice}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-black" />
              Processing...
            </>
          ) : (
            `Pay with ${selectedToken}`
          )}
        </Button>
      </form>
    </Form>
  </div>
);
}