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
import CountrySelector from '../utilityBills/CountrySelector';
import { TOKENS } from '../../context/utilityProvider/tokens';
import { 
  fetchMobileOperators, 
  fetchDataPlans, 
  verifyPhoneNumber,
  type NetworkOperator,
  type DataPlan
} from '../../services/utility/utilityServices';

const formSchema = z.object({
  country: z.string({
    required_error: "Please select a country.",
  }),
  phoneNumber: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [networks, setNetworks] = useState<NetworkOperator[]>([]);
  const [availablePlans, setAvailablePlans] = useState<DataPlan[]>([]);
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
      country: "NG", // Default to Nigeria
      phoneNumber: "",
      network: "",
      plan: "",
      paymentToken: "cusd",
    },
  });
  
  const watchCountry = form.watch("country");
  const watchNetwork = form.watch("network");
  const watchPlan = form.watch("plan");
  const watchPaymentToken = form.watch("paymentToken");

  // Fetch network providers when country changes
  useEffect(() => {
    const getNetworks = async () => {
      if (watchCountry) {
        setIsLoading(true);
        form.setValue("network", "");
        form.setValue("plan", "");
        
        try {
          const operators = await fetchMobileOperators(watchCountry);
          setNetworks(operators);
        } catch (error) {
          console.error("Error fetching mobile operators:", error);
          toast({
            title: "Error",
            description: "Failed to load network providers. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    getNetworks();
  }, [watchCountry, form, toast]);

  // Fetch data plans when network changes
  useEffect(() => {
    const getDataPlans = async () => {
      if (watchNetwork && watchCountry) {
        setIsLoading(true);
        form.setValue("plan", "");
        
        try {
          const plans = await fetchDataPlans(watchNetwork, watchCountry);
          setAvailablePlans(plans);
          console.log("Available Plans: ", plans);
        } catch (error) {
          console.error("Error fetching data plans:", error);
          toast({
            title: "Error",
            description: "Failed to load data plans. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        setAvailablePlans([]);
      }
    };
    
    getDataPlans();
  }, [watchNetwork, watchCountry, form, toast]);

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
      // First verify the phone number with the selected network
      const verificationResult = await verifyPhoneNumber(
        values.phoneNumber, 
        values.network,
        values.country
      );
      
      if (!verificationResult.verified) {
        throw new Error(verificationResult.message || 'Phone number verification failed');
      }
      
      const selectedPlan = availablePlans.find(plan => plan.id === values.plan);
      const networkName = networks.find(net => net.id === values.network)?.name || '';
      
      const success = await handleTransaction({
        type: 'data',
        amount: selectedPrice.toString(),
        token: values.paymentToken,
        recipient: values.phoneNumber,
        metadata: {
          countryCode: values.country,
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
        
        // Reset the form but keep the country
        form.reset({
          ...form.getValues(),
          phoneNumber: "",
          network: "",
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
                Select the country for the mobile data service.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || networks.length === 0}>
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
              <FormLabel>Data Plan</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value} 
                disabled={isLoading || !watchNetwork || availablePlans.length === 0}
              >
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
