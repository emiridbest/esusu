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
import { useToast } from "../../hooks/use-toast"
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
  const { toast } = useToast();
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [networks, setNetworks] = useState<NetworkOperator[]>([]);
  const [availablePlans, setAvailablePlans] = useState<DataPlan[]>([]);
  const [countryCurrency, setCountryCurrency] = useState<string>("");
  const [selectedToken, setSelectedToken] = useState<string | undefined>(undefined);
  const {

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

        console.log(`Verifying: Phone Number: ${phoneNumber}, Provider: ${provider}, Country: ${country}`);

        const verificationResult = await verifyAndSwitchProvider(phoneNumber, provider, country);

        if (verificationResult.verified) {
          setIsVerified(true);

          // If the provider was auto-switched, update the form value
          if (verificationResult.autoSwitched && verificationResult.correctProviderId) {
            form.setValue('network', verificationResult.correctProviderId);
            toast({
              title: "Network Provider Switched",
              description: verificationResult.message,
              variant: "default"
            });

            // Fetch plans for the new provider
            const plans = await fetchDataPlans(verificationResult.correctProviderId, country);
            setAvailablePlans(plans);
          } else {
            toast({
              title: "Verification Successful",
              description: "Phone number verified successfully",
              variant: "default"
            });
          }
        } else {
          setIsVerified(false);
          toast({
            title: "Verification Failed",
            description: verificationResult.message,
            variant: "destructive"
          });
          // Return early if verification failed
          setIsProcessing(false);
          return;
        }
      } catch (error) {
        console.error("Error during verification:", error);
        toast({
          title: "Verification Error",
          description: "An error occurred during verification. Please check your phone number and try again.",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      } finally {
        setIsVerifying(false);
      }

      // Continue with payment if verification was successful
      const selectedPlan = availablePlans.find(plan => plan.id === values.plan);
      const networkName = networks.find(net => net.id === values.network)?.name || '';

      console.log("Processing payment for:", {
        plan: selectedPlan?.name,
        amount: selectedPrice,
        network: networkName,
        phone: values.phoneNumber
      });
      console.log("Selected Token:", selectedToken);
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

        toast({
          title: "Payment Successful",
          description: "Processing your mobile data top-up...",
        });

        // Now that payment is successful, attempt the top-up
        topupAttempted = true;
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
            toast({
              title: "Top-up Successful",
              description: `Successfully topped up ${values.phoneNumber} with ${selectedPlan?.name || 'your selected plan'}.`,
            });

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
            toast({
              title: "Top-up Failed",
              description: data.error || "There was an issue processing your top-up. Our team has been notified.",
              variant: "destructive",
            });

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
          toast({
            title: "Top-up Error",
            description: "There was an error processing your top-up. Our team has been notified and will resolve this shortly.",
            variant: "destructive",
          });

          // Log for manual intervention
          console.error("Critical error - Payment succeeded but top-up failed with exception:", {
            user: values.email,
            phone: values.phoneNumber,
            amount: selectedPrice,
            error
          });
        }
      } else {
        toast({
          title: "Payment Failed",
          description: "Your payment could not be processed. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error in submission flow:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was an unexpected error processing your request.",
        variant: "destructive",
      });

      // If payment succeeded but top-up wasn't attempted, we need to log this for manual intervention
      if (paymentSuccessful && !topupAttempted) {
        console.error("Critical error - Payment succeeded but top-up was never attempted:", {
          user: values.email,
          phone: values.phoneNumber,
          amount: selectedPrice,
          error
        });
      }
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
                    onChange={(val) => {
                      field.onChange(val);
                      if (val) setCountryCurrency(val);
                    }}
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your email" {...field} />
                </FormControl>
                <FormDescription>
                  Enter your email for transaction receipt.
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
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    if(val) setSelectedToken(val);
                  }}
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
                    countryCurrency={form.getValues().country}
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
            )}        </Button>
        </form>
      </Form>
  );
}
