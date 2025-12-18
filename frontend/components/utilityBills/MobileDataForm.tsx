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
import CountrySelector from '../utilityBills/CountrySelector';
import { TOKENS } from '@/context/utilityProvider/tokens';
import { TOKENS as UTILS_TOKENS } from '@/utils/tokens';
import {
  fetchMobileOperators,
  fetchDataPlans,
  verifyAndSwitchProvider,
  type NetworkOperator,
  type DataPlan
} from '@/services/utility/utilityServices';
import { useBalance } from '@/context/utilityProvider/useBalance';
import { PaymentSuccessModal } from './PaymentSuccessModal';

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
  const router = useRouter();
  const [networks, setNetworks] = useState<NetworkOperator[]>([]);
  const [dataPlanOptions, setDataPlanOptions] = useState<DataPlan[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<any>(null);
  const [countryCurrency, setCountryCurrency] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [availablePlans, setAvailablePlans] = useState<DataPlan[]>([]);
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
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

      if (paymentResult.success && paymentResult.transactionHash) {
        paymentSuccessful = true;
        updateStepStatus('send-payment', 'success');

        toast.success("Processing your mobile data top-up...");

        // Now that payment is successful, attempt the top-up
        topupAttempted = true;
        updateStepStatus('top-up', 'loading');

        try {
          // Format the phone number as expected by the API
          const cleanPhoneNumber = values.phoneNumber.replace(/[\s\-\+]/g, '');

          // SECURITY: Make the top-up request with payment validation
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };

          const response = await fetch('/api/topup', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              operatorId: values.network,
              amount: selectedPrice.toString(),
              customId: paymentResult.transactionHash,
              recipientPhone: {
                country: values.country,
                phoneNumber: cleanPhoneNumber
              },
              email: values.email,
              serviceType: 'data',
              // SECURITY: Payment validation fields
              transactionHash: paymentResult.transactionHash,
              expectedAmount: paymentResult.convertedAmount,
              paymentToken: paymentResult.paymentToken
            }),
          });

          // Parse response with better error handling
          let data: any;
          try {
            const responseText = await response.text();
            console.log('Top-up API raw response:', responseText);
            data = responseText ? JSON.parse(responseText) : {};
          } catch (parseError) {
            console.error('Failed to parse API response:', parseError);
            data = { success: false, error: 'Invalid response from server' };
          }

          console.log('Top-up API parsed data:', data);
          console.log('Response status:', response.status, 'Response OK:', response.ok);

          if (response.ok && data.success) {
            updateStepStatus('top-up', 'success');

            // Show prominent success modal instead of toast
            const selectedOperator = networks.find(op => op.id === values.network);
            setSuccessDetails({
              type: 'data' as const,
              amount: selectedPrice.toString(),
              currency: countryCurrency,
              recipient: values.phoneNumber,
              transactionHash: paymentResult.transactionHash,
              provider: selectedOperator?.name,
              emailSent: data.emailSent,
              smsSent: data.smsSent
            });
            setShowSuccessModal(true);

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
            // Extract error message with fallbacks
            const errorMsg = data?.error || data?.message ||
              (response.status === 503 ? 'Service temporarily unavailable. Please try again.' :
                response.status === 502 ? 'Top-up provider error. Payment recorded, please contact support.' :
                  response.status === 500 ? 'Server error. Payment recorded, please contact support.' :
                    response.status === 403 ? 'Payment validation failed. Please verify your transaction.' :
                      'There was an issue processing your top-up. Our team has been notified.');

            console.error("Top-up API Error:", {
              status: response.status,
              statusText: response.statusText,
              data,
              errorMsg
            });

            toast.error(errorMsg);
            updateStepStatus('top-up', 'error', "Top-up failed but payment succeeded, Please screenshot this error and contact support.");

            // Here we would ideally log this to a monitoring system for manual resolution
            console.error("Payment succeeded but top-up failed. Manual intervention required:", {
              user: values.email,
              phone: values.phoneNumber,
              amount: selectedPrice,
              transactionHash: paymentResult.transactionHash,
              responseStatus: response.status,
              error: data?.error || errorMsg,
              details: data?.details,
              fullResponse: data
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
    <Card className="bg-white/50 dark:bg-black/40 backdrop-blur-md border border-gray-100 dark:border-gray-800 shadow-lg shadow-primary/5">
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">COUNTRY</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <CountrySelector
                        value={field.value}
                        onChange={(val) => {
                          field.onChange(val);
                          if (val) setCountryCurrency(val);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="network"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold"> NETWORK PROVIDER</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || networks.length === 0}>
                    <FormControl className="relative">
                      <SelectTrigger className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700">
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
                    <SelectContent className="bg-white dark:bg-black border-gray-200 dark:border-gray-800">
                      {networks.length > 0 ? (
                        networks.map((network) => (
                          <SelectItem
                            key={network.id}
                            value={network.id}
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
                        <div className="px-2 py-1 text-sm text-muted-foreground">
                          No network providers available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {isLoading && <div className="text-xs text-muted-foreground mt-1 flex items-center">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading providers...
                  </div>}
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">DATA PLAN</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading || !watchNetwork || availablePlans.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Select data plan" className='text-xs' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white dark:bg-black border-gray-200 dark:border-gray-800">
                      {availablePlans.length > 0 ? (
                        availablePlans.map((plan) => (
                          <SelectItem
                            key={plan.id}
                            value={plan.id}
                          >
                            {plan.name} - {plan.price}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1 text-sm text-muted-foreground">
                          No data plans available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {isLoading && <div className="text-xs text-muted-foreground mt-1 flex items-center">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading plans...
                  </div>}
                  {!isLoading && watchNetwork && availablePlans.length === 0 && (
                    <div className="text-xs text-red-500 mt-1">
                      No data plans available for this network
                    </div>
                  )}
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">EMAIL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your email"
                      {...field}
                      className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">PHONE NUMBER</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter phone number"
                      {...field}
                      className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">PAYMENT TOKEN</FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      if (val) setSelectedToken(val);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder="Select payment token" className='text-xs'>
                          {field.value && (() => {
                            const selectedTokenConfig = UTILS_TOKENS[field.value];
                            const tokenName = TOKENS.find(t => t.id === field.value)?.name || field.value;
                            return (
                              <div className="flex items-center gap-2">
                                {selectedTokenConfig?.logoUrl && (
                                  <img src={selectedTokenConfig.logoUrl} alt={tokenName} className="w-4 h-4" />
                                )}
                                <span>{tokenName}</span>
                              </div>
                            );
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white dark:bg-black border-gray-200 dark:border-gray-800">
                      {TOKENS.map((token) => {
                        const logoUrl = UTILS_TOKENS[token.id]?.logoUrl;
                        return (
                          <SelectItem
                            key={token.id}
                            value={token.id}
                          >
                            <div className="flex items-center gap-2">
                              {logoUrl && (
                                <img src={logoUrl} alt={token.name} className="w-5 h-5" />
                              )}
                              <span>{token.name}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            {selectedPrice > 0 && (
              <Card className="bg-primary/5 border-primary/20 dark:bg-primary/10">
                <CardContent className="pt-4">
                  <div className="flex flex-col space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Payment Amount
                    </div>
                    <div className="text-2xl font-bold text-primary">
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
              className="w-full font-semibold"
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

        {/* Success Modal */}
        {successDetails && (
          <PaymentSuccessModal
            open={showSuccessModal}
            onClose={() => {
              setShowSuccessModal(false);
              setSuccessDetails(null);
              // Navigate to transaction page after modal is closed
              router.push(`/tx/${successDetails.transactionHash}`);
            }}
            paymentDetails={successDetails}
          />
        )}
      </CardContent>
    </Card>
  );
}