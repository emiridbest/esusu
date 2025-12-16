"use client";

import React, { useState, useEffect } from 'react';
import DualCurrencyPrice from './DualCurrencyPrice';
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useUtility } from '../../context/utilityProvider/UtilityContext';
import { TOKENS } from '../../context/utilityProvider/tokens';
import { TOKENS as UTILS_TOKENS } from '../../utils/tokens';
import CountrySelector from './CountrySelector';

import { Button } from "../../components/ui/button";
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
import { useToast } from "../../hooks/use-toast";
import { Loader2, AlertCircle, Info, CheckCircle } from "lucide-react";
import { ElectricityProvider, fetchElectricityProviders } from '../../services/utility/utilityServices';
import { PaymentSuccessModal } from './PaymentSuccessModal';

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
  const { toast } = useToast();
  const [amount, setAmount] = useState<number>(0);
  const [providers, setProviders] = useState<ElectricityProvider[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [countryCurrency, setCountryCurrency] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<string | undefined>(undefined);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    customerName?: string;
    customerAddress?: string;
    tariff?: string;
    outstandingAmount?: number;
    error?: string;
  } | null>(null);
  const [amountValidation, setAmountValidation] = useState<{
    type: 'error' | 'warning' | 'info' | 'success' | '';
    message: string;
    isValid: boolean;
  }>({ type: '', message: '', isValid: true });
  const [providerLimits, setProviderLimits] = useState<{
    minAmount: number;
    maxAmount: number;
  } | null>(null);

  const {
    updateStepStatus,
    openTransactionDialog,
    isProcessing,
    setIsProcessing,
    handleTransaction,
    convertCurrency,
    countryData
  } = useUtility();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      country: '',
      meterNumber: '',
      provider: '',
      amount: '',
      email: '',
      paymentToken: 'cusd',
    },
  });

  const watchAmount = form.watch("amount");
  const watchPaymentToken = form.watch("paymentToken");
  const watchCountry = form.watch("country");
  const watchProvider = form.watch("provider");
  const watchMeterNumber = form.watch("meterNumber");

  // Fetch network providers when country changes
  useEffect(() => {
    const getProviders = async () => {
      if (watchCountry) {
        setIsLoading(true);
        form.setValue("provider", "");

        try {
          const provider = await fetchElectricityProviders(watchCountry);
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
      setAmount(Number(watchAmount));
    } else {
      setAmount(0);
    }
  }, [watchAmount]);

  // Update selected token
  useEffect(() => {
    setSelectedToken(watchPaymentToken);
  }, [watchPaymentToken, setSelectedToken]);

  // Clear filled parameters when country changes
  useEffect(() => {
    if (watchCountry) {
      form.setValue("provider", "");
      form.setValue("meterNumber", "");
      form.setValue("amount", "");
      setAmount(0);
      setProviderLimits(null);
      setAmountValidation({ type: '', message: '', isValid: true });
      setValidationResult(null);
    }
  }, [watchCountry, form]);

  // Update provider limits when provider is selected
  useEffect(() => {
    if (watchProvider && providers.length > 0) {
      const selectedProvider = providers.find(p => p.id === watchProvider);
      // Check both possible property names (minAmount/maxAmount or minLocalTransactionAmount/maxLocalTransactionAmount)
      const minAmount = (selectedProvider as any).minLocalTransactionAmount || (selectedProvider as any).minAmount;
      const maxAmount = (selectedProvider as any).maxLocalTransactionAmount || (selectedProvider as any).maxAmount;
      if (selectedProvider && minAmount && maxAmount) {
        setProviderLimits({
          minAmount: minAmount,
          maxAmount: maxAmount
        });
      } else {
        setProviderLimits(null);
      }
    } else {
      setProviderLimits(null);
    }
  }, [watchProvider, providers]);

  // Validate amount (hide amount validation during meter validation)
  useEffect(() => {
    if (isValidating) {
      setAmountValidation({ type: '', message: '', isValid: true });
      return;
    }
    if (watchAmount && watchAmount.trim() !== '') {
      const numAmount = Number(watchAmount);
      if (isNaN(numAmount)) {
        setAmountValidation({
          type: 'error',
          message: 'Please enter a valid number',
          isValid: false
        });
      } else if (numAmount <= 0) {
        setAmountValidation({
          type: 'error',
          message: 'Amount must be greater than 0',
          isValid: false
        });
      } else if (providerLimits && numAmount < providerLimits.minAmount) {
        setAmountValidation({
          type: 'error',
          message: `Amount must be at least ${providerLimits.minAmount} ${countryCurrency}`,
          isValid: false
        });
      } else if (providerLimits && numAmount > providerLimits.maxAmount) {
        setAmountValidation({
          type: 'error',
          message: `Amount cannot exceed ${providerLimits.maxAmount} ${countryCurrency}`,
          isValid: false
        });
      } else {
        setAmountValidation({
          type: 'success',
          message: 'Valid amount',
          isValid: true
        });
      }
    } else {
      setAmountValidation({
        type: '',
        message: '',
        isValid: true
      });
    }
  }, [watchAmount, providerLimits, countryCurrency, isValidating]);

  // Validate customer when provider and meter number are available
  useEffect(() => {
    setValidationResult(null);
    setAmountValidation({ type: '', message: '', isValid: true });
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
          toast({
            title: "Meter Validated",
            description: `Customer validated: ${data.customerName || 'Valid meter number'}`,
          });
        } else {
          toast({
            title: "Validation Failed",
            description: data.error || 'Unable to validate meter number',
            variant: "destructive",
          });
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
  }, [watchCountry, watchProvider, watchMeterNumber, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsProcessing(true);
    openTransactionDialog("electricity", values.meterNumber)
    updateStepStatus("check-balance", "loading");
    try {
      // Convert currency for payment validation
      const currencyCode = countryData?.currency?.code || 'NGN';
      const convertedAmount = await convertCurrency(values.amount, currencyCode);

      if (!Number.isFinite(convertedAmount) || convertedAmount <= 0) {
        throw new Error('Currency conversion failed. Please try again.');
      }

      updateStepStatus("check-balance", "success");
      updateStepStatus("send-payment", "loading");

      // Process blockchain payment first
      const txResult = await handleTransaction({
        type: 'electricity',
        amount: values.amount,
        token: selectedToken,
        recipient: values.meterNumber,
        metadata: {
          providerId: values.provider,
          provider: providers,
          countryCode: values.country,
        }
      });

      if (txResult && txResult.success && txResult.transactionHash) {
        updateStepStatus("send-payment", "success");
        updateStepStatus("electricity-payment", "loading");

        // After successful on-chain payment, call backend API
        const backendRequestBody = {
          country: values.country,
          providerId: values.provider,
          customerId: values.meterNumber,
          customerEmail: values.email,
          customerPhone: values.email, // Use email as phone if not provided
          amount: Number(values.amount),
          // SECURITY: Payment validation fields
          transactionHash: txResult.transactionHash,
          expectedAmount: convertedAmount.toString(),
          paymentToken: selectedToken || 'cusd'
        };

        console.log('Sending to backend:', backendRequestBody);
        const backendResponse = await fetch('/api/utilities/electricity/pay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(backendRequestBody),
        });

        const data = await backendResponse.json();

        if (backendResponse.ok && data.success) {
          const selectedProvider = providers.find(p => p.id === values.provider);

          updateStepStatus('electricity-payment', 'success');

          // Show prominent success modal instead of toast
          setSuccessDetails({
            type: 'electricity' as const,
            amount: values.amount,
            currency: countryCurrency || currencyCode,
            recipient: values.meterNumber,
            transactionHash: txResult.transactionHash,
            token: data.token,
            units: data.units,
            provider: selectedProvider?.name,
            emailSent: data.emailSent,
            smsSent: data.smsSent
          });
          setShowSuccessModal(true);

          // Reset the form but keep the country and payment token
          form.reset({
            ...form.getValues(),
            country: values.country,
            provider: "",
            meterNumber: "",
            amount: "",
            email: values.email,
            paymentToken: values.paymentToken,
          });
          setAmount(0);
          setValidationResult(null);
        } else {
          throw new Error(data.error || 'Payment processing failed');
        }
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
      updateStepStatus("send-payment", "error");
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
                <FormLabel className="text-black/80 dark:text-white/60 font-light text-sm">COUNTRY</FormLabel>
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
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black/80 dark:text-white/60 font-light text-sm">ELECTRICITY PROVIDER</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading || providers.length === 0}
                >
                  <FormControl>
                    <SelectTrigger className="bg-gray-100 dark:bg-white/10  text-gray-900 dark:text-white">
                      <SelectValue placeholder={providers.length === 0 ? "Select a country first" : "Select electricity provider"} className="text-xs" />
                    </SelectTrigger>

                  </FormControl>
                  <SelectContent className="bg-white">
                    {providers.map((provider) => (
                      <SelectItem
                        key={provider.id}
                        value={provider.id}
                        className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20 focus:bg-yellow-100 dark:focus:bg-yellow-800/30 text-black/80 dark:text-white/60 dark:text-gray-200"
                      >
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoading && <div className="text-sm text-gray-600 mt-1 flex items-center">
                  <Loader2 className="h-3 w-3 animate-spin mr-1 text-yellow-500" /> Loading providers...
                </div>}
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="meterNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black/80 dark:text-white/60 font-light text-sm">METER NUMBER</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter meter number"
                    {...field}
                    className="text-xs bg-gray-100 dark:bg-white/10 "
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
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black/80 dark:text-white/60 font-light text-sm">AMOUNT</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder={providerLimits
                        ? `Enter amount (${providerLimits.minAmount} - ${providerLimits.maxAmount})`
                        : countryCurrency
                          ? `Enter amount (${countryCurrency})`
                          : "Enter amount"}
                      {...field}
                      className="text-xs bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white transition-all duration-200"
                      disabled={isLoading}
                    />
                    {!isValidating && amountValidation.message && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {amountValidation.type === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                        {amountValidation.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                        {amountValidation.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
                        {amountValidation.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                    )}
                  </div>
                </FormControl>
                {!isValidating && amountValidation.message && (
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
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentToken"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-black/80 dark:text-white/60 font-light text-sm">PAYMENT TOKEN</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-gray-100 dark:bg-white/10  text-gray-900 dark:text-white">
                      <SelectValue placeholder="Select payment token" className="text-xs">
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
                  <SelectContent className="bg-white">
                    {TOKENS.map((token) => {
                      const logoUrl = UTILS_TOKENS[token.id]?.logoUrl;
                      return (
                        <SelectItem
                          key={token.id}
                          value={token.id}
                          className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20 focus:bg-yellow-100 dark:focus:bg-yellow-800/30 text-black/80 dark:text-white/60 dark:text-gray-200"
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
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />

          {amount > 0 && amountValidation.isValid && TOKENS.some(token => token.id === selectedToken) && watchCountry && watchProvider && !isLoading ? (
            <Card className="bg-gradient-to-r from-yellow-100 via-yellow-200 to-yellow-100 dark:from-yellow-400 dark:via-yellow-300 dark:to-yellow-400 border-2 border-yellow-300 dark:border-0 shadow-lg shadow-yellow-400/20 dark:shadow-yellow-400/30">
              <CardContent className="pt-4">
                <div className="flex flex-col space-y-1">
                  <div className="text-sm font-light text-black/80 dark:text-white/60 dark:text-black">
                    Payment Amount:
                  </div>
                  <div className="text-gray-900 dark:text-black font-medium">
                    <DualCurrencyPrice
                      amount={Number(watchAmount)}
                      stablecoin={selectedToken}
                      countryCurrency={watchCountry}
                      showTotal={true}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : amount > 0 && amountValidation.isValid && (isLoading || !watchProvider || !watchCountry) && (
            <Card className="bg-gradient-to-r from-yellow-100 via-yellow-200 to-yellow-100 dark:from-yellow-400 dark:via-yellow-300 dark:to-yellow-400 border-2 border-yellow-300 dark:border-0 shadow-lg shadow-yellow-400/20 dark:shadow-yellow-400/30">
              <CardContent className="pt-4">
                <div className="flex flex-col space-y-1">
                  <div className="text-sm font-medium text-gray-800 dark:text-black">
                    Payment Amount:
                  </div>
                  <div className="text-gray-900 dark:text-black font-medium animate-pulse">
                    Loading conversion...
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
                <FormLabel className="text-black/80 dark:text-white/60 font-light text-sm">EMAIL ADDRESS</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    {...field}
                    className="text-xs bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white"
                  />
                </FormControl>
                <FormMessage className="text-red-600" />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-500 dark:from-yellow-400 dark:via-yellow-500 dark:to-yellow-400 dark:hover:from-yellow-500 dark:hover:via-yellow-600 dark:hover:to-yellow-500 text-black font-light py-3 shadow-lg shadow-yellow-400/30 dark:shadow-yellow-400/40 border-0 transition-all duration-200 hover:shadow-xl hover:shadow-yellow-400/40 dark:hover:shadow-yellow-400/50 transform hover:-translate-y-0.5"
            disabled={isProcessing || !watchAmount || Number(watchAmount) <= 0 || (validationResult && !validationResult.valid) || isValidating || !amountValidation.isValid}
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

      {/* Success Modal */}
      {showSuccessModal && successDetails && (
        <PaymentSuccessModal
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          paymentDetails={successDetails}
        />
      )}
    </div>
  );
}