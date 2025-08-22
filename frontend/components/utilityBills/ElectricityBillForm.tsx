"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DualCurrencyPrice from './DualCurrencyPrice';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useUtility } from '@/context/utilityProvider/UtilityContext';
import { TOKENS } from '@/context/utilityProvider/tokens';
import CountrySelector from './CountrySelector';

import { Button } from "@/components/ui/button";
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
import { toast } from 'sonner';
import { Loader2 } from "lucide-react";
import { ElectricityProvider, fetchElectricityProviders } from '@/services/utility/utilityServices';
import { useBalance } from '@/context/utilityProvider/useBalance';

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
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  paymentToken: z.string({
    required_error: "Please select a payment token.",
  }),
});

export default function ElectricityBillForm() {
  const [amount, setAmount] = useState<number>(0);
  const [providers, setProviders] = useState<ElectricityProvider[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [countryCurrency, setCountryCurrency] = useState<string>(""); 
  const [selectedToken, setSelectedToken] = useState<string | undefined>(undefined);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    customerName?: string;
    customerAddress?: string;
    tariff?: string;
    outstandingAmount?: number;
    error?: string;
  } | null>(null);
  const { checkTokenBalance } = useBalance();
  const {
    updateStepStatus,
    openTransactionDialog,
    isProcessing,
    setIsProcessing,
    handleTransaction
  } = useUtility();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      country: "",
      meterNumber: "",
      provider: "",
      amount: "",
      email: "",
      paymentToken: "CUSD",
    },
  });

  const watchCountry = form.watch("country");
  const watchProvider = form.watch("provider");
  const watchMeterNumber = form.watch("meterNumber");
  const watchAmount = form.watch("amount");
  const watchPaymentToken = form.watch("paymentToken");

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
          console.error("Error in electricity payment submission:", error);
          toast.error(error instanceof Error ? error.message : "There was an unexpected error processing your request.");
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
      setAmount(Number(watchAmount));
    } else {
      setAmount(0);
    }
  }, [watchAmount]);

  // Watch payment token
  useEffect(() => {
    if (watchPaymentToken) {
      setSelectedToken(watchPaymentToken);
    }
  }, [watchPaymentToken]);

  // Validate customer when provider and meter number are available
  useEffect(() => {
    const validateCustomer = async () => {
      if (!watchCountry || !watchProvider || !watchMeterNumber || watchMeterNumber.length < 8) {
        setValidationResult(null);
        return;
      }

      setIsValidating(true);
      try {
        const response = await fetch('/api/utilities/electricity/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            country: watchCountry,
            providerId: watchProvider,
            customerId: watchMeterNumber
          })
        });

        const data = await response.json();
        setValidationResult(data);

        if (data.valid) {
          toast.success(`Customer validated: ${data.customerName || 'Valid meter number'}`);
        } else {
          toast.error(data.error || 'Unable to validate meter number');
        }
      } catch (error) {
        console.error('Validation error:', error);
        setValidationResult({
          valid: false,
          error: 'Validation service unavailable'
        });
      } finally {
        setIsValidating(false);
      }
    };

    const timeoutId = setTimeout(validateCustomer, 1000); // Debounce validation
    return () => clearTimeout(timeoutId);
  }, [watchCountry, watchProvider, watchMeterNumber]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsProcessing(true);
    openTransactionDialog("electricity", values.meterNumber);
    updateStepStatus("electricity-payment", "loading");
    try {
      const apiKey = process.env.NEXT_PUBLIC_PAYMENT_API_KEY;
      if (!apiKey) {
        toast.error("Payment temporarily unavailable: missing API key. Please contact support.");
        updateStepStatus("electricity-payment", "error", "Missing API key");
        setIsProcessing(false);
        return;
      }

      const paymentResult = await handleTransaction({
        type: 'electricity',
        amount: values.amount,
        token: values.paymentToken,
        recipient: values.meterNumber,
        metadata: {
          providerId: values.provider,
          provider: providers,
        }
      });

      if (paymentResult.success && paymentResult.transactionHash) {
        // After successful on-chain payment, call backend top-up with validation and API key
        const response = await fetch('/api/utilities/electricity/pay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.NEXT_PUBLIC_PAYMENT_API_KEY || ''
          },
          body: JSON.stringify({
            country: values.country,
            providerId: values.provider,
            customerId: values.meterNumber,
            customerEmail: values.email,
            customerPhone: values.email, // Use email as phone if not provided
            amount: amount,
            // SECURITY: Payment validation fields
            transactionHash: paymentResult.transactionHash,
            expectedAmount: paymentResult.convertedAmount,
            paymentToken: paymentResult.paymentToken
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          const selectedProvider = providers.find(p => p.id === values.provider);
          const successMessage = data.token 
            ? `Electricity bill paid successfully! Token: ${data.token}${data.units ? `, Units: ${data.units}` : ''}` 
            : `Electricity bill of ${data.approvedAmount} ${countryCurrency} paid successfully to ${selectedProvider?.name || 'selected provider'}.`;
          
          toast.success(successMessage);
          updateStepStatus('top-up', 'success');
          // Redirect to transaction status page
          router.push(`/tx/${paymentResult.transactionHash}`);

          // Reset the form but keep the country and payment token
          form.reset({
            ...form.getValues(),
            country: values.country,
            provider: "",
            meterNumber: "",
            amount: "",
            email: values.email,
            paymentToken: values.paymentToken
          });
          setAmount(0);
          setValidationResult(null);
        } else {
          console.error('Electricity Payment API Error:', data);
          toast.error(data.error || "There was an issue processing your electricity bill payment. Our team has been notified.");
          updateStepStatus('top-up', 'error', "Electricity payment failed but blockchain payment succeeded. Please screenshot this error and contact support.");
        }
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      const msg = error instanceof Error ? error.message : "There was an error processing your payment. Please try again.";
      toast.error(`Payment Failed: ${msg}`);
      updateStepStatus("electricity-payment", "error");
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
                <FormLabel className="text-gray-800 dark:text-yellow-400 font-medium text-sm">Country</FormLabel>
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
                  Select the country for the electricity service.
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
                <FormLabel className="text-gray-800 dark:text-yellow-400 font-medium text-sm">Electricity Provider</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading || providers.length === 0}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white dark:bg-gray-800 border-2 border-yellow-400/50 dark:border-yellow-400/30 hover:border-yellow-500 dark:hover:border-yellow-400 focus:border-yellow-500 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 transition-all duration-200 text-gray-900 dark:text-white">
                      <SelectValue placeholder={providers.length === 0 ? "Select a country first" : "Select electricity provider"} className="text-xs" />
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
                  <Loader2 className="h-3 w-3 animate-spin mr-1 text-yellow-500 dark:text-yellow-400" /> Loading providers...
                </div>}
                <FormDescription className="text-xs text-gray-600 dark:text-gray-300">
                  {providers.length === 0 && "Please select a country first to see available providers"}
                </FormDescription>
                <FormMessage className="text-red-600 dark:text-yellow-300" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="meterNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-800 dark:text-yellow-400 font-medium text-sm">Meter Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter meter number" 
                    {...field} 
                    className={`text-xs bg-white dark:bg-gray-800 border-2 transition-all duration-200 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 ${
                      validationResult === null 
                        ? 'border-yellow-400/50 dark:border-yellow-400/30 hover:border-yellow-500 dark:hover:border-yellow-400 focus:border-yellow-500 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30'
                        : validationResult.valid
                          ? 'border-green-400 dark:border-green-500 focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-400/20 dark:focus:ring-green-400/30'
                          : 'border-red-400 dark:border-red-500 focus:border-red-500 dark:focus:border-red-400 focus:ring-2 focus:ring-red-400/20 dark:focus:ring-red-400/30'
                    }`}
                  />
                </FormControl>
                {isValidating && (
                  <div className="text-sm text-yellow-600 dark:text-yellow-300 mt-1 flex items-center">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" /> Validating meter number...
                  </div>
                )}
                {validationResult && (
                  <div className={`text-sm mt-1 ${validationResult.valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {validationResult.valid 
                      ? `✓ Valid meter: ${validationResult.customerName || 'Meter number validated'}${validationResult.outstandingAmount ? ` (Outstanding: ${validationResult.outstandingAmount})` : ''}`
                      : `✗ ${validationResult.error || 'Invalid meter number'}`
                    }
                  </div>
                )}
                <FormDescription className="text-xs text-gray-600 dark:text-gray-300">
                  Enter your electricity meter number.
                </FormDescription>
                <FormMessage className="text-red-600 dark:text-yellow-300" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-800 dark:text-yellow-400 font-medium text-sm">Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    {...field}
                    className="text-xs bg-white dark:bg-gray-800 border-2 border-yellow-400/50 dark:border-yellow-400/30 hover:border-yellow-500 dark:hover:border-yellow-400 focus:border-yellow-500 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-white transition-all duration-200"
                  />
                </FormControl>
                <FormDescription className="text-xs text-gray-600 dark:text-gray-300">
                  Enter the amount you want to pay.
                </FormDescription>
                <FormMessage className="text-red-600 dark:text-yellow-300" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentToken"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-800 dark:text-yellow-400 font-medium text-sm">Payment Token</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

          {amount > 0 && (
            <Card className="bg-gradient-to-r from-yellow-100 via-yellow-200 to-yellow-100 dark:from-yellow-400 dark:via-yellow-300 dark:to-yellow-400 border-2 border-yellow-300 dark:border-0 shadow-lg shadow-yellow-400/20 dark:shadow-yellow-400/30">
              <CardContent className="pt-4">
                <div className="flex flex-col space-y-1">
                  <div className="text-sm font-medium text-gray-800 dark:text-black">
                    Payment Amount:
                  </div>
                  <div className="text-gray-900 dark:text-black font-medium">
                    <DualCurrencyPrice
                      amount={amount}
                      stablecoin={selectedToken}
                      showTotal={true}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-800 dark:text-yellow-400 font-medium text-sm">Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    {...field}
                    className="text-xs bg-white dark:bg-gray-800 border-2 border-yellow-400/50 dark:border-yellow-400/30 hover:border-yellow-500 dark:hover:border-yellow-400 focus:border-yellow-500 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-white transition-all duration-200"
                  />
                </FormControl>
                <FormDescription className="text-xs text-gray-600 dark:text-gray-300">
                  We'll send payment confirmation to this email.
                </FormDescription>
                <FormMessage className="text-red-600 dark:text-yellow-300" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-500 dark:from-yellow-400 dark:via-yellow-500 dark:to-yellow-400 dark:hover:from-yellow-500 dark:hover:via-yellow-600 dark:hover:to-yellow-500 text-black font-medium py-3 shadow-lg shadow-yellow-400/30 dark:shadow-yellow-400/40 border-0 transition-all duration-200 hover:shadow-xl hover:shadow-yellow-400/40 dark:hover:shadow-yellow-400/50 transform hover:-translate-y-0.5"
            disabled={isProcessing || amount <= 0 || (validationResult && !validationResult.valid) || isValidating}
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