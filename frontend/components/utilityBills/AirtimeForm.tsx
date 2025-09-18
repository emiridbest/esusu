"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DualCurrencyPrice from './DualCurrencyPrice';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { toast } from 'sonner';
import { Loader2, AlertCircle, CheckCircle, Info } from "lucide-react";
import CountrySelector from '../utilityBills/CountrySelector';
import { TOKENS } from '@/context/utilityProvider/tokens';
import {
  fetchAirtimeOperators,
  verifyAndSwitchProvider,
  type AirtimeOperator,
} from '@/services/utility/utilityServices';
import { useBalance } from '@/context/utilityProvider/useBalance';
import { getCountryData } from '@/utils/countryData';

// Updated form schema to handle direct amount entry
const formSchema = z.object({
  country: z.string({
    required_error: "Please select a country.",
  }),
  phoneNumber: z.string()
    .min(10, { message: "Phone number must be at least 10 digits." })
    .refine(val => /^\d+$/.test(val.replace(/[\s-]/g, '')), {
      message: "Phone number should contain only digits, spaces, or hyphens."
    }),
  network: z.string({
    required_error: "Please select a network provider.",
  }),
  amount: z.string()
    .min(1, { message: "Please enter an amount." })
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a valid positive number."
    }),
  paymentToken: z.string({
    required_error: "Please select a payment token.",
  }),
  email: z.string().email({
    message: "Invalid email address.",
  })
});

interface OperatorRange {
  min: number;
  max: number;
  currency?: string;
}

export default function AirtimeForm() {
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [networks, setNetworks] = useState<AirtimeOperator[]>([]);
  const [countryCurrency, setCountryCurrency] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<string | undefined>(undefined);
  const [operatorRange, setOperatorRange] = useState<OperatorRange | null>(null);
  
  const [amountValidation, setAmountValidation] = useState<{
    isValid: boolean;
    message: string;
    type: 'error' | 'warning' | 'success' | 'info';
  }>({ isValid: true, message: '', type: 'success' });

  const { checkTokenBalance } = useBalance();

  const {
    transactionSteps,
    updateStepStatus,
    openTransactionDialog,
    closeTransactionDialog,
    isProcessing,
    setIsProcessing,
    handleTransaction
  } = useUtility();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      country: "",
      phoneNumber: "",
      network: "",
      amount: "",
      email: "",
      paymentToken: "",
    },
  });

  const watchCountry = form.watch("country");
  const watchNetwork = form.watch("network");
  const watchAmount = form.watch("amount");
  const watchPaymentToken = form.watch("paymentToken");

// 1. Fetch network providers when country changes
useEffect(() => {
  const getNetworks = async () => {
    if (!watchCountry) return;

    setIsLoading(true);
    try {
      form.setValue("network", "");
      form.setValue("amount", "");
      setOperatorRange(null);

      const operators = await fetchAirtimeOperators(watchCountry);
      setNetworks(operators);
    } catch (error) {
      console.error("Error fetching airtime operators:", error);
      toast.error("Failed to load network providers. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  getNetworks();
  // Depend on country and form (used inside effect)
}, [watchCountry, form]);

// 2. Fetch operator range when network or country changes
useEffect(() => {
  const getOperatorRange = async () => {
    if (!watchCountry || !watchNetwork) {
      setOperatorRange(null);
      return;
    }

    setIsLoading(true);
    form.setValue("amount", "");

    try {
      const countryData = getCountryData(watchCountry);
      const currency = countryData?.currency?.code;

      const response = await fetch(`/api/utilities/airtime/amount?provider=${watchNetwork}&country=${watchCountry}`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setOperatorRange({
          min: data.localMinAmount,
          max: data.localMaxAmount,
          currency
        });
      } else {
        console.warn("Fallback to default range for country:", watchCountry);

        const defaultRanges: { [key: string]: { min: number, max: number } } = {
          ke: { min: 10, max: 10000 },
          ug: { min: 500, max: 377857 },
          ng: { min: 50, max: 200000 },
          gh: { min: 1, max: 1000 },
          za: { min: 5, max: 5000 }
        };

        const fallback = defaultRanges[watchCountry] || { min: 1, max: 1000 };
        setOperatorRange({
          min: fallback.min,
          max: fallback.max,
          currency
        });
      }
    } catch (error) {
      console.error("Error fetching operator range:", error);
      toast.error("Failed to load amount limits. Please try again.");
      setOperatorRange(null);
    } finally {
      setIsLoading(false);
    }
  };

  getOperatorRange();
}, [watchNetwork, watchCountry, form]);

// 3. Validate amount against operator range
useEffect(() => {
  if (!operatorRange) {
    setAmountValidation({ isValid: true, message: '', type: 'success' });
    setSelectedPrice(0);
    return;
  }

  const enteredAmount = parseFloat(watchAmount);

  if (isNaN(enteredAmount)) {
    setAmountValidation({
      isValid: false,
      message: 'Please enter a valid number',
      type: 'error'
    });
    setSelectedPrice(0);
    return;
  }

  if (enteredAmount < operatorRange.min) {
    setAmountValidation({
      isValid: false,
      message: `Minimum amount is ${operatorRange.min} ${operatorRange.currency}`,
      type: 'error'
    });
    setSelectedPrice(0);
  } else if (enteredAmount > operatorRange.max) {
    setAmountValidation({
      isValid: false,
      message: `Maximum amount is ${operatorRange.max} ${operatorRange.currency}`,
      type: 'error'
    });
    setSelectedPrice(0);
  } else {
    setAmountValidation({
      isValid: true,
      message: '',
      type: 'success'
    });
    setSelectedPrice(enteredAmount);
  }
}, [watchAmount, operatorRange]);

// 4. Watch payment token
useEffect(() => {
  if (watchPaymentToken) {
    setSelectedToken(watchPaymentToken);
  }
}, [watchPaymentToken]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Validate amount one more time before submission
    const enteredAmount = parseFloat(values.amount);
    if (!operatorRange) {
      toast.error("Please select a network provider first.");
      return;
    }
    if (enteredAmount < operatorRange.min || enteredAmount > operatorRange.max) {
      toast.error(`Amount must be between ${operatorRange.min} and ${operatorRange.max} ${operatorRange.currency || operatorRange.currency}`);
      return;
    }

    setIsProcessing(true);
    let paymentSuccessful = false;
    let topupAttempted = false;

    try {
      // First verify the phone number with the selected network
      setIsVerifying(true);

      try {
        const phoneNumber = values.phoneNumber;
        const country = values.country;
        const provider = values.network;
        if (!phoneNumber || !country || !provider || !selectedToken) {
          setIsProcessing(false);
          toast.error("Please ensure all fields are filled out correctly.");
          throw new Error("Please ensure all fields are filled out correctly.");
        }
        openTransactionDialog("airtime", values.phoneNumber);
        updateStepStatus('verify-phone', 'loading');

        const verificationResult = await verifyAndSwitchProvider(phoneNumber, provider, country);

        if (verificationResult.verified) {
          setIsVerified(true);
          toast.success("Phone number verified successfully");

          if (verificationResult.autoSwitched && verificationResult.correctProviderId) {
            form.setValue('network', verificationResult.correctProviderId);
            toast.success(verificationResult.message);
          } else {
            toast.success("You are now using the correct network provider.");
            updateStepStatus('verify-phone', 'success');
          }
        } else {
          setIsVerified(false);
          toast.error("Phone number verification failed. Please double-check the phone number.");
          setIsProcessing(false);
          updateStepStatus('verify-phone', 'error', "Your phone number did not verify with the selected network provider. Please check the number and try again.");
          return;
        }
      } catch (error) {
        console.error("Error during verification:", error);
        setIsProcessing(false);
        return;
      } finally {
        setIsVerifying(false);
      }

      // Continue with payment if verification was successful
      const networkName = networks.find(net => net.id === values.network)?.name || '';
      updateStepStatus('check-balance', 'loading');

      // Check if the user has enough token balance
      const hasEnoughBalance = await checkTokenBalance(selectedPrice.toString(), selectedToken, values.country);
      if (!hasEnoughBalance) {
        toast.error(`Insufficient ${selectedToken} balance to complete this transaction.`);
        updateStepStatus('check-balance', 'error', `Insufficient ${selectedToken} balance`);
        return false;
      }
      updateStepStatus('check-balance', 'success');
      updateStepStatus('send-payment', 'loading');

      // Process blockchain payment first
      const paymentResult = await handleTransaction({
        type: 'airtime',
        amount: selectedPrice.toString(),
        token: selectedToken,
        recipient: values.phoneNumber,
        metadata: {
          countryCode: values.country,
          networkId: values.network,
          amountId: values.amount,
          amount: selectedPrice,
          network: networkName
        }
      });

      if (paymentResult.success && paymentResult.transactionHash) {
        paymentSuccessful = true;
        updateStepStatus('send-payment', 'success');

        toast.success("Processing your airtime top-up...");

        // Now that payment is successful, attempt the top-up
        topupAttempted = true;
        updateStepStatus('top-up', 'loading');

        try {
          const cleanPhoneNumber = values.phoneNumber.replace(/[\s\-\+]/g, '');

          // SECURITY: Send payment validation data to prevent bypass
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          const apiKey = process.env.NEXT_PUBLIC_PAYMENT_API_KEY;
          if (apiKey) headers['x-api-key'] = apiKey;

          const response = await fetch('/api/topup', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              operatorId: values.network,
              amount: enteredAmount.toString(),
              customId: paymentResult.transactionHash,
              useLocalAmount: true,
              recipientPhone: {
                country: values.country,
                phoneNumber: cleanPhoneNumber
              },
              email: values.email,
              type: 'airtime',
              // SECURITY: Payment validation fields
              transactionHash: paymentResult.transactionHash,
              expectedAmount: paymentResult.convertedAmount,
              paymentToken: paymentResult.paymentToken
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            toast.success(`Successfully topped up ${values.phoneNumber} with ${enteredAmount} ${operatorRange.currency} airtime.`);
            updateStepStatus('top-up', 'success');
            // Redirect to transaction status page
            router.push(`/tx/${paymentResult.transactionHash}`);

            // Reset the form but keep the country
            form.reset({
              ...form.getValues(),
              country: values.country,
              phoneNumber: "",
              network: "",
              amount: "",
              email: values.email,
              paymentToken: values.paymentToken
            });
            setSelectedPrice(0);
            closeTransactionDialog();
          } else {
            console.error("Top-up API Error:", data);
            toast.error(data.error || "There was an issue processing your top-up. Our team has been notified.");
            updateStepStatus('top-up', 'error', "Top-up failed but payment succeeded, Please screenshot this error and contact support.");

            console.error("Payment succeeded but top-up failed. Manual intervention required:", {
              user: values.email,
              phone: values.phoneNumber,
              amount: enteredAmount,
              error: data.error,
              transactionDetails: data.details
            });
          }
        } catch (error) {
          console.error("Error during top-up:", error);
          toast.error("There was an error processing your top-up. Our team has been notified and will resolve this shortly.");
          updateStepStatus('top-up', 'error', "Top-up failed but payment succeeded, Please screenshot this error and contact support.");

          console.error("Critical error - Payment succeeded but top-up failed with exception:", {
            user: values.email,
            phone: values.phoneNumber,
            amount: enteredAmount,
            error
          });
        }
      } else {
        toast.error("Your payment could not be processed. Please try again.");
        updateStepStatus('send-payment', 'error', "Payment failed, please close this window and try again.");
      }
    } catch (error) {
      console.error("Error in submission flow:", error);
      toast.error(error instanceof Error ? error.message : "There was an unexpected error processing your request.");
      const loadingStepIndex = transactionSteps.findIndex(step => step.status === 'loading');
      if (loadingStepIndex !== -1) {
        updateStepStatus(
          transactionSteps[loadingStepIndex].id,
          'error',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
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
                <FormLabel className="text-black-800 dark:text-yellow-400 font-medium text-sm">Country</FormLabel>
                <FormControl>
                  <div className="relative">
                    <CountrySelector
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val);
                        if (val) setCountryCurrency(val.toUpperCase());
                      }}
                    />
                  </div>
                </FormControl>
                <FormDescription className="text-xs text-black/60 dark:text-white/30">
                  Select the country for the airtime service.
                </FormDescription>
                <FormMessage className="text-red-600 dark:text-yellow-300" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="network"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black/80 dark:text-yellow-400 font-medium text-sm">Network Provider</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || networks.length === 0}>
                  <FormControl className="relative">
                    <SelectTrigger className="bg-white dark:bg-black/90 border-2 border-black/70 hover:border-black/70 
                    -400 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 transition-all duration-200 text-black/90 dark:text-white/90">
                      <SelectValue placeholder="Select network provider" className='text-xs'>
                        {field.value && networks && networks.length > 0 && (() => {
                          const selectedNetwork = networks.find(n => n.id === field.value);
                          if (selectedNetwork && selectedNetwork.logoUrls && selectedNetwork.logoUrls.length > 0) {
                            return (
                              <div className="flex items-center">
                                <img
                                  src={selectedNetwork.logoUrls[0]}
                                  alt={selectedNetwork.name}
                                  className="h-4 w-4 mr-2 rounded-sm object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <span>{selectedNetwork.name}</span>
                              </div>
                            );
                          }
                          return field.value ? field.value : "Select network provider";
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white dark:bg-black/90 border-2 dark:border-yellow-400/40">
                    {networks.length > 0 ? (
                      networks.map((network) => (
                        <SelectItem
                          key={network.id}
                          value={network.id}
                          className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20 focus:bg-yellow-600 dark:focus:bg-yellow-800/30 text-black/90 dark:text-white/90"
                        >
                          <div className="flex items-center">
                            {network.logoUrls && network.logoUrls.length > 0 && (
                              <img
                                src={network.logoUrls[0]}
                                alt={network.name}
                                className="h-5 w-5 mr-2 rounded-sm object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            <span>{network.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1 text-sm text-black/90 dark:text-white/90">
                        No network providers available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {isLoading && <div className="text-sm text-black/60 dark:text-yellow-300 mt-1 flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1 text-primary/900 dark:text-yellow-400" /> Loading providers...
                </div>}
                <FormMessage className="text-red-600 dark:text-yellow-300" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black-800 dark:text-yellow-400 font-medium text-sm">Phone Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter phone number"
                    {...field}
                    className="text-xs bg-white dark:bg-black/90 border-2 border-black/70  hover:border-primary/900 
                    -400 focus:border-primary/900 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 placeholder:text-black-500 dark:placeholder:text-black-400 text-black-900 dark:text-white/90 transition-all duration-200"
                  />
                </FormControl>
                <FormDescription className="text-xs text-black/60 dark:text-white/30">
                  Enter the phone number to recharge with airtime.
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
                <FormLabel className="text-black-800 dark:text-yellow-400 font-medium text-sm">
                  Airtime Amount {operatorRange && `(${operatorRange.currency})`}
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder={operatorRange ? `Enter amount (${operatorRange.min} - ${operatorRange.max})` : "Enter amount"}
                      {...field}
                      className={`text-xs bg-white dark:bg-black/80 border-2 ${!amountValidation.isValid
                        ? 'border-red-400 dark:border-red-400'
                        : amountValidation.type === 'warning'
                          ? 'border-black/90 dark:border-yellow-400'
                          : amountValidation.type === 'info'
                            ? 'border-blue-400 dark:border-blue-400'
                            : 'border-black/70 '
                        } hover:border-black/70 
                         -400 focus:ring-2 dark:focus:border-yellow-400 focus:ring-2 focus:ring-black/70 dark:focus:ring-yellow-400/30 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-white transition-all duration-200`}
                      disabled={isLoading || !operatorRange}
                    />
                    {amountValidation.message && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {amountValidation.type === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                        {amountValidation.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                        {amountValidation.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
                        {amountValidation.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                    )}
                  </div>
                </FormControl>

                {/* Amount validation message */}
                {amountValidation.message && (
                  <div className={`text-xs mt-1 flex items-center ${amountValidation.type === 'error'
                    ? 'text-red-600 dark:text-red-400'
                    : amountValidation.type === 'warning'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : amountValidation.type === 'info'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                    {amountValidation.message}
                  </div>
                )}

                {/* Loading state */}
                {isLoading && watchNetwork && (
                  <div className="text-sm text-black/60 dark:text-yellow-300 mt-1 flex items-center">
                    <Loader2 className="h-3 w-3 animate-spin mr-1 text-primary/900 dark:text-yellow-400" /> Loading amount limits...
                  </div>
                )}

                {/* No range available */}
                {!isLoading && watchNetwork && !operatorRange && (
                  <div className="text-sm text-red-600 dark:text-yellow-300 mt-1">
                    No amount limits available for this network
                  </div>
                )}

                <FormMessage className="text-red-600 dark:text-yellow-300" />
              </FormItem>
            )}
          />


          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black-800 dark:text-yellow-400 font-medium text-sm">Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your email"
                    {...field}
                    className="text-xs bg-white dark:bg-black/90 border-2 border-black/70  hover:border-primary/900 
                    -400 focus:border-primary/900 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 placeholder:text-black-500 dark:placeholder:text-black-400 text-black-900 dark:text-white/90 transition-all duration-200"
                  />
                </FormControl>
                <FormDescription className="text-xs text-black/60 dark:text-white/30">
                  Enter your email for transaction receipt.
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
                <FormLabel className="text-black/80 dark:text-yellow-400 font-medium text-sm">Payment Token</FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    if (val) setSelectedToken(val);
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white dark:bg-black/90 border-2 border-black/70 hover:border-black/70 dark:hover:border-yellow-400 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 transition-all duration-200 text-black/90 dark:text-white/90">
                      <SelectValue placeholder="Select payment token" className='text-xs' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white dark:bg-black/90 border-2 dark:border-yellow-400/40">
                    {TOKENS.map((token) => (
                      <SelectItem
                        key={token.id}
                        value={token.id}
                        className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20 focus:bg-yellow-600 dark:focus:bg-yellow-800/30 text-black/90 dark:text-white/90"
                      >
                        {token.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs text-black-600 dark:text-black-300">
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
                  <div className="text-sm font-medium text-black/80 dark:text-white/90">
                    Payment Amount:
                  </div>
                  <div className="text-black/90 dark:text-white/90 font-medium">
                    <DualCurrencyPrice
                      amount={selectedPrice}
                      countryCurrency={form.getValues().country}
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
            className="w-full bg-gradient-to-r from-yellow-400 via-primary/900 to-yellow-400 hover:from-primary/900 hover:via-yellow-600 hover:to-primary/900 dark:from-yellow-400 dark:via-primary/900 dark:to-yellow-400 dark:hover:from-primary/900 dark:hover:via-yellow-600 dark:hover:to-primary/900 text-black font-medium py-3 shadow-lg shadow-yellow-400/30 dark:shadow-yellow-400/40 border-0 transition-all duration-200 hover:shadow-xl hover:shadow-yellow-400/40 dark:hover:shadow-yellow-400/50 transform hover:-translate-y-0.5"
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
