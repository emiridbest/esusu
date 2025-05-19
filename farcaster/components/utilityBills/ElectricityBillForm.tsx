"use client";

import React, { useState, useEffect } from 'react';
import DualCurrencyPrice from '../../components/DualCurrencyPrice';
import { parseAmount } from '../../utils/currency';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useUtility } from '../../context/utilityProvider/UtilityContext';
import { TOKENS } from '../../context/utilityProvider/tokens';
import CountrySelector from './CountrySelector';

import { Button } from "../../components/ui/button";
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
import { useToast } from "../../hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ElectricityProvider, fetchElectricityProviders } from '../../services/utility/utilityServices';

const formSchema = z.object({
  country: z.string({
    required_error: "Please select a country.",
  }),
  meterNumber: z.string().min(1, {
    message: "Meter number is required.",
  }),
  provider: z.string({
    required_error: "Please select an electricity provider.",
  }),
  amount: z.string().min(1, {
    message: "Amount is required.",
  }),
  paymentToken: z.string({
    required_error: "Please select a payment token.",
  }),
});

export default function ElectricityBillForm() {
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(0);
  const [providers, setProviders] = useState<ElectricityProvider[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      country: '',
      meterNumber: '',
      provider: '',
      amount: '',
      paymentToken: 'cusd',
    },
  });

  const watchAmount = form.watch("amount");
  const watchPaymentToken = form.watch("paymentToken");
  const watchCountry = form.watch("country");
  const watchProvider = form.watch("provider");

   // Fetch network providers when country changes
   useEffect(() => {
     const getProviders = async () => {
       if (watchCountry) {
         setIsLoading(true);
         form.setValue("provider", "");
         
         try {
           const provider = await fetchElectricityProviders(watchCountry);
           console.log("Fetched providers:", provider);
           setProviders(provider);
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
     
     getProviders();
   }, [watchCountry, form, toast]);
  


  // Update amount when amount changes
  useEffect(() => {
    if (watchAmount) {
      setAmount(parseAmount(watchAmount));
    } else {
      setAmount(0);
    }
  }, [watchAmount]);

  // Update selected token
  useEffect(() => {
    setSelectedToken(watchPaymentToken);
  }, [watchPaymentToken, setSelectedToken]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsProcessing(true);

    try {

      const success = await handleTransaction({
        type: 'electricity',
        amount: values.amount,
        token: values.paymentToken,
        recipient: values.meterNumber,
        metadata: {
          providerId: values.provider,
          provider: providers,
        }
      });

      if (success) {
        toast({
          title: "Payment Successful",
          description: `Your electricity bill payment for ${values.meterNumber} was successful.`,
        });

        // Reset the form
        form.reset();
        setAmount(0);
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
                Select the country for the electricity service.
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
              <FormLabel>Electricity Provider</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading || providers.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={providers.length === 0 ? "Select a country first" : "Select electricity provider"} />
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
              <FormDescription>
                {providers.length === 0 && "Please select a country first to see available providers"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="meterNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meter Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter meter number" {...field} />
              </FormControl>
              <FormDescription>
                Enter your electricity meter number.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Enter the amount you want to pay.
              </FormDescription>
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

        {amount > 0 && (
          <Card className="bg-gray-50 dark:bg-gray-800/50">
            <CardContent className="pt-4">
              <div className="flex flex-col space-y-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Payment Amount:
                </div>
                <DualCurrencyPrice
                  amount={amount}
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
          disabled={isProcessing || amount <= 0}
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
