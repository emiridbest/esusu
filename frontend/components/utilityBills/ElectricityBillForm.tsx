import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { toast } from 'sonner';
import { AlertCircle, Info, CheckCircle, Loader2 } from "lucide-react";
import { ElectricityProvider, fetchElectricityProviders } from '@/services/utility/utilityServices';
import { useBalance } from '@/context/utilityProvider/useBalance';
import { useUtility } from "@/context/utilityProvider/UtilityContext";
import { PaymentSuccessModal } from './PaymentSuccessModal';
import DualCurrencyPrice from './DualCurrencyPrice';
import CountrySelector from './CountrySelector';
import { TOKENS } from '@/context/utilityProvider/tokens';
import { TOKENS as UTILS_TOKENS } from '@/utils/tokens';

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
  const selectedToken = watchPaymentToken;

  // (Removed useEffect for selectedToken)

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
          console.error("Error in electricity payment submission:", error);
          toast.error(error instanceof Error ? error.message : "There was an unexpected error processing your request.");
        } finally {
          setIsLoading(false);
        }
      }
    };

    getProviders();
  }, [watchCountry, form]);

  // Clear filled parameters when country changes
  useEffect(() => {
    if (watchCountry) {
      form.setValue("provider", "");
      form.setValue("meterNumber", "");
      form.setValue("amount", "");
      // Don't reset payment token - let user keep their selection
      // form.setValue("paymentToken", "CUSD");
      form.setValue("email", "");
      setAmount(0);
      setProviderLimits(null);
      setAmountValidation({ type: '', message: '', isValid: true });
    }
  }, [watchCountry]);

  // Update amount when amount changes
  useEffect(() => {
    if (watchAmount) {
      setAmount(Number(watchAmount));
    } else {
      setAmount(0);
    }
  }, [watchAmount]);

  // Update provider limits when provider is selected
  useEffect(() => {
    if (watchProvider && providers.length > 0) {
      const selectedProvider = providers.find(p => p.id === watchProvider);
      if (selectedProvider && selectedProvider.minLocalTransactionAmount && selectedProvider.maxLocalTransactionAmount) {
        setProviderLimits({
          minAmount: selectedProvider.minLocalTransactionAmount,
          maxAmount: selectedProvider.maxLocalTransactionAmount
        });
      } else {
        // No valid limits available from API
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

  // Validate customer when provider and meter number are available (INDEPENDENT of amount)
  useEffect(() => {
    // Only run validation when meter number, provider, or country changes
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
            // Note: Amount is NOT required for meter validation
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
    // Additional validation to prevent submission with invalid amount
    const rawAmount = values.amount;
    const submittedAmount = Number(rawAmount);

    console.log('🔍 Debug - Amount validation:', {
      rawAmount,
      submittedAmount,
      isNaN: isNaN(submittedAmount),
      isValidNumber: !isNaN(submittedAmount) && submittedAmount > 0,
      providerLimits
    });

    if (isNaN(submittedAmount) || submittedAmount <= 0) {
      console.error('❌ Invalid amount detected:', rawAmount);
      toast.error(`Please enter a valid amount greater than 0. You entered: "${rawAmount}"`);
      return;
    }

    // Custom validation for provider limits
    if (providerLimits) {
      console.log('🔍 Checking provider limits:', {
        submittedAmount,
        minAmount: providerLimits.minAmount,
        maxAmount: providerLimits.maxAmount,
        withinLimits: submittedAmount >= providerLimits.minAmount && submittedAmount <= providerLimits.maxAmount
      });

      if (submittedAmount < providerLimits.minAmount) {
        toast.error(`Amount must be at least ${providerLimits.minAmount} ${countryCurrency}`);
        return;
      }
      if (submittedAmount > providerLimits.maxAmount) {
        toast.error(`Amount cannot exceed ${providerLimits.maxAmount} ${countryCurrency}`);
        return;
      }
    }

    console.log('✅ Amount validation passed, proceeding with payment...');

    setIsProcessing(true);
    openTransactionDialog("electricity", values.meterNumber);
    updateStepStatus('check-balance', 'loading');
    const hasEnoughBalance = await checkTokenBalance(values.amount, selectedToken, values.country);
    if (!hasEnoughBalance) {
      toast.error(`Insufficient ${selectedToken} balance to complete this transaction.`);
      updateStepStatus('check-balance', 'error', `Insufficient ${selectedToken} balance`);
      setIsProcessing(false);
      return;
    }
    updateStepStatus('check-balance', 'success');
    updateStepStatus("send-payment", "loading");

    try {
      const paymentResult = await handleTransaction({
        type: 'electricity',
        amount: values.amount,
        token: values.paymentToken,
        recipient: values.meterNumber,
        metadata: {
          providerId: values.provider,
          provider: providers,
          countryCode: watchCountry,
        }
      });

      if (paymentResult.success && paymentResult.transactionHash) {
        updateStepStatus("send-payment", "success");
        updateStepStatus("electricity-payment", "loading");
        // After successful on-chain payment, call backend top-up with validation and API key
        const backendRequestBody = {
          country: values.country,
          providerId: values.provider,
          customerId: values.meterNumber,
          customerEmail: values.email,
          customerPhone: values.email, // Use email as phone if not provided
          amount: Number(values.amount),
          // SECURITY: Payment validation fields
          transactionHash: paymentResult.transactionHash,
          expectedAmount: paymentResult.convertedAmount,
          paymentToken: paymentResult.paymentToken
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
          updateStepStatus('top-up', 'success');

          // Show prominent success modal instead of toast
          setSuccessDetails({
            type: 'electricity' as const,
            amount: values.amount,
            currency: countryCurrency,
            recipient: values.meterNumber,
            transactionHash: paymentResult.transactionHash,
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
            paymentToken: values.paymentToken
          });
          setAmount(0);
          setValidationResult(null);
        } else {
          console.error('Electricity Payment API Error:', data);
          // Show backend error message if available, else generic message
          const errorMsg = data.error || data.message || "There was an issue processing your electricity bill payment. Our team has been notified.";
          toast.error(errorMsg);
          updateStepStatus('electricity-payment', 'error', errorMsg);
          updateStepStatus('top-up', 'error', errorMsg);
        }
      } else {
        // Log backend response for debugging
        console.error('Electricity Payment API response:', paymentResult);
        // Show user-friendly error if transaction is declined
        let errorMsg = 'Transaction request declined.';
        if (typeof paymentResult === 'object' && paymentResult && paymentResult.success === false) {
          errorMsg = 'Transaction request declined.';
        } else if (typeof paymentResult === 'object' && paymentResult) {
          errorMsg = JSON.stringify(paymentResult);
        }
        toast.error(errorMsg);
        updateStepStatus('send-payment', 'error', errorMsg);
        updateStepStatus('electricity-payment', 'error', errorMsg);
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      const msg = error instanceof Error ? error.message : "There was an error processing your payment. Please try again.";
      toast.error(`Payment Failed: ${msg}`);
      updateStepStatus("send-payment", "error", msg);
      updateStepStatus("electricity-payment", "error", msg);
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
                          if (val) setCountryCurrency(val.toUpperCase());
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
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">ELECTRICITY PROVIDER</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading || providers.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700">
                        <SelectValue placeholder={providers.length === 0 ? "Select a country first" : "Select electricity provider"} className="text-xs" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white dark:bg-black border-gray-200 dark:border-gray-800">
                      {providers.map((provider) => (
                        <SelectItem
                          key={provider.id}
                          value={provider.id}
                        >
                          {provider.name}
                        </SelectItem>
                      ))}
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
              name="meterNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">METER NUMBER</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter meter number"
                      {...field}
                      className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700"
                    />
                  </FormControl>
                  {isValidating && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-500 mt-1 flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-1" /> Validating meter number...
                    </div>
                  )}
                  {validationResult && (
                    <div className={`text-xs mt-1 ${validationResult.valid ? 'text-green-500' : 'text-red-500'}`}>
                      {validationResult.valid
                        ? `✓ Valid meter: ${validationResult.customerName || 'Meter number validated'}${validationResult.outstandingAmount ? ` (Outstanding: ${validationResult.outstandingAmount})` : ''}`
                        : `✗ ${validationResult.error || 'Invalid meter number'}`
                      }
                    </div>
                  )}
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">AMOUNT</FormLabel>
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
                        className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700"
                        disabled={isLoading}
                      />
                      {/* Only show amount validation if not validating meter */}
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

                  {/* Only show amount validation if not validating meter */}
                  {!isValidating && amountValidation.message && (
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700">
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

            {amount > 0 && amountValidation.isValid && TOKENS.some(token => token.id === selectedToken) && watchCountry && watchProvider && !isLoading ? (
              <Card className="bg-primary/5 border-primary/20 dark:bg-primary/10">
                <CardContent className="pt-4">
                  <div className="flex flex-col space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Payment Amount
                    </div>
                    <div className="text-2xl font-bold text-primary">
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
              <Card className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700 animate-pulse">
                <CardContent className="pt-4">
                  <div className="flex flex-col space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      Payment Amount
                    </div>
                    <div className="text-lg font-medium">
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
                  <FormLabel className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">EMAIL ADDRESS</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      {...field}
                      className="bg-white/50 dark:bg-black/20 border-gray-200 dark:border-gray-700"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={isProcessing || !watchAmount || Number(watchAmount) <= 0 || (validationResult && !validationResult.valid) || isValidating}
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