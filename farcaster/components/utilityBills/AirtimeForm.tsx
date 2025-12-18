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
import { Loader2, AlertCircle, CheckCircle, Info } from "lucide-react";
import CountrySelector from '../utilityBills/CountrySelector';
import { TOKENS } from '../../context/utilityProvider/tokens';
import { TOKENS as UTILS_TOKENS } from '../../utils/tokens';
import {
  fetchAirtimeOperators,
  verifyAndSwitchProvider,
  type AirtimeOperator,
} from '../../services/utility/utilityServices';
import { useBalance } from '../../context/utilityProvider/useBalance';
import { getCountryData } from '../../utils/countryData';
import { useAccount } from 'wagmi';
import { PaymentSuccessModal } from './PaymentSuccessModal';

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
  const [selectedToken, setSelectedToken] = useState<string | undefined>("");
  const [operatorRange, setOperatorRange] = useState<OperatorRange | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    type: 'airtime';
    amount: string;
    currency: string;
    recipient: string;
    transactionHash: string;
    token?: string;
    provider?: string;
    emailSent?: boolean;
    smsSent?: boolean;
  } | null>(null);

  const [amountValidation, setAmountValidation] = useState<{
    isValid: boolean;
    message: string;
    type: 'error' | 'warning' | 'success' | 'info';
  }>({ isValid: true, message: '', type: 'success' });

  const { address } = useAccount();
  const { checkTokenBalance } = useBalance();

  const {
    transactionSteps,
    updateStepStatus,
    openTransactionDialog,
    isProcessing,
    closeTransactionDialog,
    setIsProcessing,
    handleTransaction
  } = useUtility();

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
    // Only depend on country change
  }, [watchCountry]);

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
  }, [watchNetwork, watchCountry]);

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
      const hasEnoughBalance = await checkTokenBalance(selectedToken, selectedPrice.toString(), values.country);
      if (!hasEnoughBalance) {
        toast.error(`Insufficient ${selectedToken} balance to complete this transaction.`);
        updateStepStatus('check-balance', 'error', `Insufficient ${selectedToken} balance`);
        return false;
      }
      updateStepStatus('check-balance', 'success');
      updateStepStatus('send-payment', 'loading');

      // Process blockchain payment first
      const txResult = await handleTransaction({
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

      if (txResult && txResult.success && txResult.transactionHash) {
        paymentSuccessful = true;
        updateStepStatus('send-payment', 'success');

        toast.success("Processing your airtime top-up...");

        // Now that payment is successful, attempt the top-up
        topupAttempted = true;
        updateStepStatus('top-up', 'loading');

        try {
          const cleanPhoneNumber = values.phoneNumber.replace(/[\s\-\+]/g, '');

          // Send the user-entered amount directly to the API
          const response = await fetch('/api/topup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operatorId: values.network,
              amount: enteredAmount.toString(),
              customId: txResult.transactionHash,
              useLocalAmount: true,
              recipientPhone: {
                country: values.country,
                phoneNumber: cleanPhoneNumber
              },
              email: values.email,
              walletAddress: address,
              type: 'airtime'
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            updateStepStatus('top-up', 'success');

            // Show success modal
            const countryData = getCountryData(values.country);
            setSuccessDetails({
              type: 'airtime',
              amount: enteredAmount.toString(),
              currency: operatorRange?.currency || countryData?.currency?.code || '',
              recipient: values.phoneNumber,
              transactionHash: txResult.transactionHash,
              token: selectedToken,
              provider: networkName,
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
              amount: "",
              email: values.email,
              paymentToken: values.paymentToken
            });
            setSelectedPrice(0);
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
    <Card className="bg-white/50 dark:bg-black/40 backdrop-blur-md border border-gray-100 dark:border-gray-800 shadow-lg shadow-primary/5">
      <CardContent className="p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">NETWORK PROVIDER</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || networks.length === 0}>
                    <FormControl className="relative">
                      <SelectTrigger className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-10">
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
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">PHONE NUMBER</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter phone number"
                      {...field}
                      className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-10 text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                    AIRTIME AMOUNT {operatorRange && `(${operatorRange.currency})`}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder={operatorRange ? `Enter amount (${operatorRange.min} - ${operatorRange.max})` : "Enter amount"}
                        {...field}
                        className={`bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-10 text-sm ${!amountValidation.isValid
                          ? 'border-red-400 dark:border-red-400'
                          : amountValidation.type === 'warning'
                            ? 'border-yellow-500'
                            : amountValidation.type === 'info'
                              ? 'border-blue-400'
                              : ''
                          }`}
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
                      ? 'text-red-500'
                      : amountValidation.type === 'warning'
                        ? 'text-yellow-500'
                        : amountValidation.type === 'info'
                          ? 'text-blue-500'
                          : 'text-green-500'
                      }`}>
                      {amountValidation.message}
                    </div>
                  )}

                  {/* Loading state */}
                  {isLoading && watchNetwork && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading amount limits...
                    </div>
                  )}

                  {/* No range available */}
                  {!isLoading && watchNetwork && !operatorRange && (
                    <div className="text-xs text-red-500 mt-1">
                      No amount limits available for this network
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
                      className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-10 text-sm"
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
                      <SelectTrigger className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700 h-10">
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
                <CardContent className="pt-4 pb-4">
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
              className="w-full font-semibold h-12 text-sm"
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

        {successDetails && (
          <PaymentSuccessModal
            open={showSuccessModal}
            onClose={() => {
              setShowSuccessModal(false);
              setSuccessDetails(null);
              closeTransactionDialog();
            }}
            paymentDetails={successDetails}
          />
        )}
      </CardContent>
    </Card>
  );
}
