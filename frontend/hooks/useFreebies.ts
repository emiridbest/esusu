// hooks/useFreebiesLogic.js
"use client";
import { useState, useEffect, useMemo } from "react";
import {
  useActiveAccount,
  useActiveWallet,
} from "thirdweb/react";
import { toast } from 'sonner';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { number, z } from "zod";
import {
    fetchMobileOperators,
    fetchDataPlans,
    verifyAndSwitchProvider,
    type NetworkOperator,
    type DataPlan
} from '../services/utility/utilityServices';
import { useClaimProcessor } from '../context/utilityProvider/ClaimContextProvider';

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

export const useFreebiesLogic = () => {
    const account = useActiveAccount();
    const wallet = useActiveWallet();
    const address = account?.address;
    const isConnected = !!account && !!wallet;
    const {
        updateStepStatus,
        openTransactionDialog,
        closeTransactionDialog,
        isProcessing,
        setIsProcessing,
        handleClaim,
        processDataTopUp,
        processAirtimeTopUp,
        processPayment,
        transactionSteps,
        canClaim,
        isWhitelisted,
        checkingWhitelist,
        handleVerification
    } = useClaimProcessor();

    // State variables
    const [isClaiming, setIsClaiming] = useState(false);
    const [networkId, setNetworkId] = useState("");
    const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
    const [availablePlans, setAvailablePlans] = useState<DataPlan[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [networks, setNetworks] = useState<NetworkOperator[]>([]);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [isVerified, setIsVerified] = useState<boolean>(false);
    const [txID, setTxID] = useState<string | null>(null);
    const [serviceType, setServiceType] = useState<'data' | 'airtime'>('data');
    const [canClaimToday, setCanClaimToday] = useState<boolean>(true);
    const [timeRemaining, setTimeRemaining] = useState<string>("");
    const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            country: "ng",
            phoneNumber: "",
            network: "",
            plan: "",
            email: "",
            paymentToken: "",
        },
    });

    const watchCountry = form.watch("country");
    const watchNetwork = form.watch("network");

    // Check if user has already claimed today
    useEffect(() => {
        const checkLastClaim = () => {
            const lastClaim = localStorage.getItem('lastFreeClaim');
            const today = new Date().toDateString();

            if (lastClaim === today) {
                const tomorrow = new Date();
                tomorrow.setHours(24, 0, 0, 0);
                setNextClaimTime(tomorrow);
                return false;
            }
            return true;
        };

        const canClaim = checkLastClaim();
        if (!canClaim) {
            setCanClaimToday(false);
        }
    }, []);

    // Timer for countdown
    useEffect(() => {
        if (!nextClaimTime) return;

        // Calculate and set initial time immediately
        const updateTimeRemaining = () => {
            const now = new Date();
            const diff = nextClaimTime.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining("Available now!");
                setCanClaimToday(true);
                return false; // Stop timer
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
                return true; // Continue timer
            }
        };

        // Set initial value immediately
        if (!updateTimeRemaining()) return;

        // Then update every second
        const timer = setInterval(() => {
            if (!updateTimeRemaining()) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [nextClaimTime]);

    // Function to set country currency
    const setCountryCurrency = (country: string) => {
    };

    // Fetch network providers when country changes
    useEffect(() => {
        const getNetworks = async () => {
            // Reset if not Nigeria
            if (watchCountry !== "ng") {
                form.setValue("network", "");
                form.setValue("plan", "");
                setNetworks([]);
                return;
            }

            if (!watchCountry) return;

            setIsLoading(true);
            form.setValue("network", "");
            form.setValue("plan", "");

            try {
                const response = await fetch(
                    `/api/utilities/data/free?country=${watchCountry}`,
                    {
                        method: 'GET',
                    }
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch data plans: ${response.statusText}`);
                }

                const operators: NetworkOperator[] = await response.json();

                // Filter out MTN Nigeria extra data
                const filteredOperators = operators.filter(operator =>
                      !(operator.name.toLowerCase().includes('mtn nigeria extra data') ||
                        operator.name.toLowerCase().includes('mtn nigeria data'))
                );

                if (serviceType === 'data') {
                    setNetworks(filteredOperators);
                    return;
                }

                // Fetch airtime operators if needed
                try {
                    const airtimeResponse = await fetch(
                        `/api/utilities/airtime/providers?country=${watchCountry}`,
                        {
                            method: 'GET',
                        }
                    );
                    if (!airtimeResponse.ok) {
                        throw new Error(`Failed to fetch airtime providers: ${airtimeResponse.statusText}`);
                    }

                    const airtimeOperators: NetworkOperator[] = await airtimeResponse.json();

                    if (serviceType === 'airtime') {
                        setNetworks(airtimeOperators);
                    }
                } catch (airtimeError) {
                    if (airtimeError instanceof Error && airtimeError.name === 'AbortError') {
                        return;
                    }
                    console.error("Error fetching airtime operators:", airtimeError);
                    toast.error("Failed to load some network providers. Please try again.");
                }
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return;
                }
                console.error("Error fetching mobile operators:", error);
                toast.error("Failed to load network providers. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        getNetworks();


    }, [watchCountry, serviceType, form]);


    // Reset network and plan when service type changes
    useEffect(() => {
        form.setValue("network", "");
        form.setValue("plan", "");
        setAvailablePlans([]);
        setSelectedPlan(null);
    }, [serviceType, form]);

    // Fetch data plans when network changes
    useEffect(() => {
        const getDataPlans = async () => {
            if (watchNetwork && watchCountry && serviceType === 'data') {
                setIsLoading(true);
                form.setValue("plan", "");

                try {
                    const plans = await fetchDataPlans(watchNetwork, watchCountry);
                    setAvailablePlans([plans[0]]);
                    setSelectedPlan(plans[0]);
                    setNetworkId(watchNetwork);
                } catch (error) {
                    console.error("Error fetching data plans:", error);
                    toast.error("Failed to load data plans. Please try again.");
                } finally {
                    setIsLoading(false);
                }
            } else if (!watchNetwork) {
                setAvailablePlans([]);
            }
        };

        getDataPlans();
    }, [watchNetwork, watchCountry, form]);

    // Handle claim bundle logic
    async function onSubmit(values: z.infer<typeof formSchema>) {
        // Early return if already processing to prevent race conditions
        if (isProcessing || isClaiming || !canClaimToday) {
            return;
        }

        // Check localStorage before starting process
        const checkCanClaim = () => {
            if (typeof window === 'undefined') return true; // SSR check
            const lastClaim = localStorage.getItem('lastFreeClaim');
            const today = new Date().toDateString();
            return lastClaim !== today;
        };

        if (!checkCanClaim()) {
            toast.error("You have already claimed your free data bundle today. Please try again tomorrow.");
            return;
        }

        // Generate unique transaction ID for idempotency
        const transactionId = `${address}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        setIsProcessing(true);
        let hasClaimedSuccessfully = false;

        try {
            const phoneNumber = values.phoneNumber;
            const country = values.country;
            const emailAddress = values.email;
            const networkId = values.network;
            
            // Only look up plan if service type is data
            const selectedPlan = serviceType === 'data' 
                ? (availablePlans.find(plan => plan.id === values.plan) || null)
                : null;

            // Open transaction dialog to show progress
            openTransactionDialog(serviceType, phoneNumber);

            // Validation checks
            if (!isConnected) {
                toast.error("Please connect your wallet");
                return;
            }

            if (!selectedPlan && serviceType === 'data') {
                toast.error("Please select a data plan");
                return;
            }

            if (!phoneNumber) {
                toast.error("Please enter your phone number");
                return;
            }

            if (!country) {
                toast.error("Please select a country");
                return;
            }

            if (!networkId) {
                toast.error("Please select a network provider");
                return;
            }

            if (!emailAddress) {
                toast.error("Please enter your email address");
                return;
            }

            // Validate selectedPlan has required properties for data service
            if (serviceType === 'data') {
                if (!selectedPlan || !selectedPlan.price || typeof selectedPlan.price !== 'string') {
                    toast.error("Invalid data plan selected. Please try selecting a different plan.");
                    return;
                }
            }

            // Set processing flag to prevent duplicate submissions
            if (typeof window !== 'undefined') {
                localStorage.setItem('processingClaim', 'true');
            }

        setIsClaiming(true);
            setIsVerifying(true);

            try {
                // Step 1: Verify phone number
                updateStepStatus('verify-phone-number', 'loading');

                const verificationResult = await verifyAndSwitchProvider(phoneNumber, networkId, country);

                if (!verificationResult || !verificationResult.verified) {
                    setIsVerified(false);
                    toast.error("Phone number verification failed. Please double-check the phone number.");
                    updateStepStatus('verify-phone-number', 'error', "Your phone number did not verify with the selected network provider. Please check the number and try again.");
                    return;
                }

                setIsVerified(true);
                toast.success("Phone number verified successfully");
                updateStepStatus('verify-phone-number', 'success');

                if (verificationResult.autoSwitched && verificationResult.correctProviderId) {
                    form.setValue('network', verificationResult.correctProviderId);
                    toast.success(verificationResult.message || "Network provider switched successfully");

                    try {
                        const plans = await fetchDataPlans(verificationResult.correctProviderId, country);
                        if (plans && plans.length > 0) {
                            setAvailablePlans(plans);
                            setSelectedPlan(plans[0]);
                        } else {
                            throw new Error("No data plans available for the correct provider");
                        }
                    } catch (planError) {
                        console.error("Error fetching new plans after provider switch:", planError);
                        toast.error("Failed to load plans for the correct provider. Please try again.");
                        return;
                    }
                } else {
                    toast.success("You are now using the correct network provider.");
                }
            } catch (verificationError) {
                console.error("Error during verification:", verificationError);
                toast.error(verificationError instanceof Error ? verificationError.message : "There was an unexpected error during verification.");
                updateStepStatus('verify-phone-number', 'error', "Verification failed. Please try again.");
                return;
            } finally {
                setIsVerifying(false);
            }

            // Start claiming process
            setIsClaiming(true);
            updateStepStatus('claim-ubi', 'loading');
            try {
                const claimResult = await handleClaim();

                const claimFailed =
                    !claimResult ||
                    (typeof claimResult === 'object' && 'success' in claimResult && !(claimResult as any).success);

                if (claimFailed) {
                    console.error("Claim failed: handleClaim returned failure", claimResult);
                    toast.error("Failed to claim your free data bundle. Please try again.");
                    updateStepStatus('claim-ubi', 'error', "An error occurred during the claim process.");
                    return; 
                }

                hasClaimedSuccessfully = true;
                updateStepStatus('claim-ubi', 'success');
                toast.success("Claim successful! Your data bundle will be activated shortly.");
            } catch (claimError) {
                console.error("Claim failed:", claimError);
                toast.error("Failed to claim your free data bundle. Please try again.");
                updateStepStatus('claim-ubi', 'error', "An error occurred during the claim process.");
                return;
            }

            // Process payment
            updateStepStatus('payment', 'loading');
            let transactionHash: string | null = null;
            const tx = await processPayment();
            console.log("Payment transaction result:", tx);
            transactionHash = tx.transactionHash;
            setTxID(transactionHash);
            updateStepStatus('payment', 'success');

            // Step 4: Process the top-up based on service type
            if (serviceType === 'data') {
                updateStepStatus('top-up', 'loading');
                const topUpResult = await processDataTopUp(
                    {
                        phoneNumber,
                        country,
                        network: networkId,
                        email: emailAddress,
                        customId: transactionId,
                        transactionHash: tx.transactionHash,
                        expectedAmount: tx.convertedAmount,
                        paymentToken: tx.paymentToken
                    },
                    parseFloat(selectedPlan?.price || '0'),
                    availablePlans,
                    networks
                );
            
                if (!topUpResult.success) {
                    throw new Error(topUpResult.error || "Data top-up failed");
                }
                
                updateStepStatus('top-up', 'success');
            } else if (serviceType === 'airtime') {
                updateStepStatus('top-up', 'loading');
                const topUpResult = await processAirtimeTopUp(
                    {
                        phoneNumber,
                        country,
                        network: networkId,
                        email: emailAddress,
                        customId: transactionId,
                        transactionHash: tx.transactionHash,
                        expectedAmount: tx.convertedAmount,
                        paymentToken: tx.paymentToken
                    },
                    100 // Fixed amount for airtime
                );

                if (!topUpResult.success) {
                    throw new Error(topUpResult.error || "Airtime top-up failed");
                }
                
                updateStepStatus('top-up', 'success');
            }

            // Mark as successfully claimed
            hasClaimedSuccessfully = true;
            
            // Store claim timestamp
            if (typeof window !== 'undefined') {
                localStorage.setItem('lastFreeClaim', new Date().toDateString());
            }

            // Update state to prevent immediate re-claim
            setCanClaimToday(false);
            
            // Show success message
            const successMessage = serviceType === 'data' 
                ? `Successfully claimed data bundle for ${phoneNumber}!`
                : `Successfully claimed airtime for ${phoneNumber}!`;
            
            toast.success(successMessage);
            
            // Close the transaction dialog after success
            closeTransactionDialog();

        } catch (error) {
            console.error("Error in submission flow:", error);

            // Clean up localStorage on any error
            if (typeof window !== 'undefined') {
                localStorage.removeItem('processingClaim');
                // Only remove lastFreeClaim if we haven't successfully claimed
                if (!hasClaimedSuccessfully) {
                    localStorage.removeItem('lastFreeClaim');
                }
            }

            const errorMessage = error instanceof Error ? error.message : "There was an unexpected error processing your request.";
            toast.error(errorMessage);

            // Reset step statuses on critical failure
            updateStepStatus('verify-phone', 'error', errorMessage);

        } finally {
            // Always clean up states
            setIsClaiming(false);
            setIsProcessing(false);
            setIsVerifying(false);

            // Clean up processing flag
            if (typeof window !== 'undefined') {
                localStorage.removeItem('processingClaim');
            }
        }
    }
    return {
        // Form and validation
        form,
        formSchema,
        watchCountry,
        watchNetwork,

        // State
        isConnected,
        isProcessing,
        isClaiming,
        isLoading,
        isVerifying,
        isVerified,
        isWhitelisted,
        checkingWhitelist,
        handleVerification,
        serviceType,
        setServiceType,

        // Data
        networks,
        availablePlans,
        selectedPlan,

        // Functions
        setCountryCurrency,
        onSubmit,
        
        // Claim tracking
        canClaimToday,
        timeRemaining
    };
};
