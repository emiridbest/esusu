"use client";
import React, { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { Loader2 } from "lucide-react";
import CountrySelector from '../utilityBills/CountrySelector';
import { TOKENS } from '../../context/utilityProvider/tokens';
import {
  fetchMobileOperators,
  fetchDataPlans,
  verifyAndSwitchProvider,
  type NetworkOperator,
  type DataPlan
} from '../../services/utility/utilityServices';
import { useBalance } from '../../context/utilityProvider/useBalance';

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
  plan: z.string({
    required_error: "Please select a data plan.",
  }),
  paymentToken: z.string({
    required_error: "Please select a payment token.",
  }),
  email: z.string().email({
    message: "Invalid email address.",
  })
});

export default function MobileDataForm() {
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [networks, setNetworks] = useState<NetworkOperator[]>([]);
  const [availablePlans, setAvailablePlans] = useState<DataPlan[]>([]);
  const [countryCurrency, setCountryCurrency] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<string | undefined>("");
  const { checkTokenBalance } = useBalance();

  const {
    transactionSteps,
    updateStepStatus,
    openTransactionDialog,
    isProcessing,
    setIsProcessing,
    handleTransaction
  } = useUtility();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      country: "",
      phoneNumber: "",
      network: "",
      plan: "",
      email: "",
      paymentToken: "",
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
          toast.error("Failed to load network providers. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    getNetworks();
  }, [watchCountry, form]);

  // Fetch data plans when network changes
  useEffect(() => {
    const getDataPlans = async () => {
      if (watchNetwork && watchCountry) {
        setIsLoading(true);
        form.setValue("plan", "");

        try {
          const plans = await fetchDataPlans(watchNetwork, watchCountry);
          setAvailablePlans(plans);
        } catch (error) {
          console.error("Error fetching data plans:", error);
          toast.error("Failed to load data plans. Please try again.");
        } finally {
          setIsLoading(false);
        }
      } else {
        setAvailablePlans([]);
      }
    };

    getDataPlans();
  }, [watchNetwork, watchCountry, form]);

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
  }, [watchPaymentToken]);


  /**
 *
 * @param values - The form values containing country, phone number, network, plan, and payment token.
 * @param country - The selected country for the mobile data service.
 * @param phoneNumber - The phone number to recharge.
 * @param provider - The selected network provider.
 * @returns 
 */
  async function onSubmit(values: z.infer<typeof formSchema>) {
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
        openTransactionDialog("data", values.phoneNumber);
        updateStepStatus('verify-phone', 'loading');

        const verificationResult = await verifyAndSwitchProvider(phoneNumber, provider, country);

        if (verificationResult.verified) {
          setIsVerified(true);
          toast.success("Phone number verified successfully");

          // If the provider was auto-switched, update the form value
          if (verificationResult.autoSwitched && verificationResult.correctProviderId) {
            form.setValue('network', verificationResult.correctProviderId);
            toast.success(verificationResult.message);

            // Fetch plans for the new provider
            const plans = await fetchDataPlans(verificationResult.correctProviderId, country);
            setAvailablePlans(plans);
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
      const selectedPlan = availablePlans.find(plan => plan.id === values.plan);
      const networkName = networks.find(net => net.id === values.network)?.name || '';
      updateStepStatus('check-balance', 'loading');

      // Check if the user has enough token balance
      const hasEnoughBalance = await checkTokenBalance(selectedToken, selectedPrice.toString(), values.country);
      if (!hasEnoughBalance) {
        toast.error(`Insufficient ${selectedToken} balance to complete this transaction.`);
        updateStepStatus('check-balance', 'error', `Insufficient ${selectedToken} balance`);
        return false;
      }
      updateStepStatus('check-balance', 'success');
      updateStepStatus('send-payment', 'loading');

      // Process blockchain payment first
      const success = await handleTransaction({
        type: 'data',
        amount: selectedPrice.toString(),
        token: selectedToken,
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
        paymentSuccessful = true;
        updateStepStatus('send-payment', 'success');

        toast.success("Processing your mobile data top-up...");

        // Now that payment is successful, attempt the top-up
        topupAttempted = true;
        updateStepStatus('top-up', 'loading');
        try {
          // Format the phone number as expected by the API
          const cleanPhoneNumber = values.phoneNumber.replace(/[\s\-\+]/g, '');

          // Make the top-up request
          const response = await fetch('/api/topup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operatorId: values.network,
              amount: selectedPrice.toString(),
              recipientPhone: {
                country: values.country,
                phoneNumber: cleanPhoneNumber
              },
              email: values.email,
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            toast.success(`Successfully topped up ${values.phoneNumber} with ${selectedPlan?.name || 'your selected plan'}.`);
            updateStepStatus('top-up', 'success');
            // Reset the form but keep the country
            form.reset({
              ...form.getValues(),
              country: values.country,
              phoneNumber: "",
              network: "",
              plan: "",
              email: values.email,
              paymentToken: values.paymentToken
            });
            setSelectedPrice(0);
          } else {
            console.error("Top-up API Error:", data);
            toast.error(data.error || "There was an issue processing your top-up. Our team has been notified.");
            updateStepStatus('top-up', 'error', "Top-up failed but payment succeeded, Please screenshot this error and contact support.");
            // Here we would ideally log this to a monitoring system for manual resolution
            console.error("Payment succeeded but top-up failed. Manual intervention required:", {
              user: values.email,
              phone: values.phoneNumber,
              amount: selectedPrice,
              error: data.error,
              transactionDetails: data.details
            });
          }
        } catch (error) {
          console.error("Error during top-up:", error);
          toast.error("There was an error processing your top-up. Our team has been notified and will resolve this shortly.");
          updateStepStatus('top-up', 'error', "Top-up failed but payment succeeded, Please screenshot this error and contact support.");
          // Log for manual intervention
          console.error("Critical error - Payment succeeded but top-up failed with exception:", {
            user: values.email,
            phone: values.phoneNumber,
            amount: selectedPrice,
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
      // Find the current loading step and mark it as error
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
                <FormLabel className="text-black/80 dark:text-yellow-400 font-medium text-sm">Country</FormLabel>
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
                <FormDescription className="text-xs text-black/60 dark:text-white/30">
                  Select the country for the mobile data service.
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
                    <SelectTrigger className="bg-white dark:bg-black/90 border-2 border-black/70 hover:border-black/70 dark:hover:border-yellow-400 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 transition-all duration-200 text-black/90 dark:text-white/90">
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
                                    // If image fails to load, hide it
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
                                  // If image fails to load, hide it
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
                {isLoading && <div className="text-sm text-black-600 dark:text-yellow-300 mt-1 flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1 text-primary/900 dark:text-yellow-400" /> Loading providers...
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
                <FormLabel className="text-black/80 dark:text-yellow-400 font-medium text-sm">Data Plan</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoading || !watchNetwork || availablePlans.length === 0}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white dark:bg-black/90 border-2 border-black/70 hover:border-black/70 dark:hover:border-yellow-400 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 transition-all duration-200 text-black/90 dark:text-white/90">
                      <SelectValue placeholder="Select data plan" className='text-xs' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white dark:bg-black/90 border-2 dark:border-yellow-400/40">
                    {availablePlans.length > 0 ? (
                      availablePlans.map((plan) => (
                        <SelectItem
                          key={plan.id}
                          value={plan.id}
                          className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20 focus:bg-yellow-600 dark:focus:bg-yellow-800/30 text-black/90 dark:text-white/90"
                        >
                          {plan.name} - {plan.price}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1 text-sm text-black/90 dark:text-white/90">
                        No data plans available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {isLoading && <div className="text-sm text-black-600 dark:text-yellow-300 mt-1 flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1 text-primary/900 dark:text-yellow-400" /> Loading plans...
                </div>}
                {!isLoading && watchNetwork && availablePlans.length === 0 && (
                  <div className="text-sm text-red-600 dark:text-yellow-300 mt-1">
                    No data plans available for this network
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
                <FormLabel className="text-black/80 dark:text-yellow-400 font-medium text-sm">Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your email"
                    {...field}
                    className="text-xs bg-white dark:bg-black/90 border-2 border-black/70 hover:border-primary/900 dark:hover:border-yellow-400 focus:border-primary/900 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 placeholder:text-black-500 dark:placeholder:text-black-400 text-black-900 dark:text-white/90 transition-all duration-200"
                  />
                </FormControl>
                <FormDescription className="text-xs text-black-600 dark:text-black-300">
                  Enter your email for transaction receipt.
                </FormDescription>
                <FormMessage className="text-red-600 dark:text-yellow-300" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black/80 dark:text-yellow-400 font-medium text-sm">Phone Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter phone number"
                    {...field}
                    className="text-xs bg-white dark:bg-black/90 border-2 border-black/70 hover:border-primary/900 dark:hover:border-yellow-400 focus:border-primary/900 dark:focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-400/30 placeholder:text-black-500 dark:placeholder:text-black-400 text-black-900 dark:text-white/90 transition-all duration-200"

                  />
                </FormControl>
                <FormDescription className="text-xs text-black-600 dark:text-black-300">
                  Enter the phone number to recharge.
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
                  <div className="text-sm font-medium text-black/80 dark:text-black">
                    Payment Amount:
                  </div>
                  <div className="text-black-900 dark:text-black font-medium">
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