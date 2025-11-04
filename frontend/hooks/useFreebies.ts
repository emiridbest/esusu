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
import { IdentitySDK } from '@goodsdks/citizen-sdk';
import { createPublicClient, createWalletClient, custom, http, webSocket, fallback, formatUnits } from 'viem';
import { celo } from 'viem/chains';

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
        transactionSteps
    } = useClaimProcessor();

    // State variables
    const [isClaiming, setIsClaiming] = useState(false);
    const [networkId, setNetworkId] = useState("");
    const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
    const [availablePlans, setAvailablePlans] = useState<DataPlan[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<string>("");
    const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null);
    const [networks, setNetworks] = useState<NetworkOperator[]>([]);
    const [canClaimToday, setCanClaimToday] = useState(true);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [isVerified, setIsVerified] = useState<boolean>(false);
    const [isWhitelisted, setIsWhitelisted] = useState<boolean | undefined>(undefined);
    const [loadingWhitelist, setLoadingWhitelist] = useState<boolean | undefined>(undefined);
    const [txID, setTxID] = useState<string | null>(null);
    const [serviceType, setServiceType] = useState<'data' | 'airtime'>('data');

    // Initialize IdentitySDK with proper viem clients
    const publicClient = useMemo(() => {
        return createPublicClient({
            chain: celo,
            transport: http('https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8', {
                timeout: 30_000,
                retryCount: 3,
            })
        });
    }, []);

    const walletClient = useMemo(() => {
        if (isConnected && typeof window !== 'undefined' && window.ethereum && address) {
            return createWalletClient({
                account: address as `0x${string}`,
                chain: celo,
                transport: custom(window.ethereum)
            });
        }
        return null;
    }, [isConnected, address]);

    const identitySDK = useMemo(() => {
        if (isConnected && publicClient && walletClient) {
            try {
                return new IdentitySDK({
                    publicClient: publicClient as any,
                    walletClient: walletClient as any,
                    env: 'production'
                });
            } catch (error) {
                console.error('Failed to initialize IdentitySDK:', error);
                return null;
            }
        }
        return null;
    }, [publicClient, walletClient, isConnected]);

    // When wallet changes, check if user has previously verified via GoodDollar to avoid re-prompting
    useEffect(() => {
        try {
            if (typeof window !== 'undefined' && address) {
                const key = `gdVerified:${address.toLowerCase()}`;
                const flag = localStorage.getItem(key);
                if (flag === 'true') {
                    setIsWhitelisted(true);
                    setIsVerified(true);
                } else {
                    // allow normal remote check to run
                    setIsWhitelisted(undefined);
                    setIsVerified(false);
                }
            }
        } catch (e) {
            console.warn('Unable to read GoodDollar verification flag:', e);
        }
    }, [address]);

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

    // Check whitelist status
    useEffect(() => {
        const checkWhitelistStatus = async () => {
            if (address && isWhitelisted === undefined) {
                try {
                    setLoadingWhitelist(true);
                    const { isWhitelisted: whitelisted } =
                        (await identitySDK?.getWhitelistedRoot(address as `0x${string}`)) ?? {};

                    setIsWhitelisted(whitelisted);
                    setIsVerified(whitelisted ?? false);

                    // Persist verification success per wallet and notify user once
                    try {
                        if (typeof window !== 'undefined' && whitelisted && address) {
                            const key = `gdVerified:${address.toLowerCase()}`;
                            const already = localStorage.getItem(key) === 'true';
                            localStorage.setItem(key, 'true');
                            if (!already) {
                                toast.success("GoodDollar verification successful! You won't be prompted again here.");
                            }
                        }
                    } catch (e) {
                        console.warn('Unable to persist GoodDollar verification flag:', e);
                    }
                } catch (error) {
                    console.error("Error checking whitelist:", error);
                } finally {
                    setLoadingWhitelist(false);
                }
            }
        };

        checkWhitelistStatus();
    }, [address, identitySDK, isWhitelisted]);

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

        const canClaimToday = checkLastClaim();
        if (!canClaimToday) {
            setCanClaimToday(false);
        }
    }, []);

    // Timer for countdown
    useEffect(() => {
        if (!nextClaimTime) return;

        const timer = setInterval(() => {
            const now = new Date();
            const diff = nextClaimTime.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining("Available now!");
                setCanClaimToday(true);
                clearInterval(timer);
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [nextClaimTime]);

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
        const selectedPlan = availablePlans.find(plan => plan.id === values.plan) || null;

        // Validation checks
        if (!address) {
            toast.error("Please connect your wallet first");
            return;
        }

        // Validate address format
        if (!address.startsWith('0x') || address.length !== 42) {
            toast.error("Invalid wallet address format");
            return;
        }

        if (!isConnected) {
            toast.error("Please connect your wallet");
            return;
        }
        
            // Only validate plan selection for data service type
            if (serviceType === 'data' && !selectedPlan) {
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
                // Step 1: Process payment (claim UBI and transfer to recipient)
                updateStepStatus('verify-phone', 'loading');
                
                const paymentResult = await processPayment();
                if (!paymentResult) {
                    throw new Error("Payment processing failed");
                }
                
                updateStepStatus('verify-phone', 'success');
                updateStepStatus('claim-ubi', 'loading');

                // Step 2: Process the top-up based on service type
                if (serviceType === 'data') {
            updateStepStatus('top-up', 'loading');
                    const topUpResult = await processDataTopUp(
                {
                    phoneNumber,
                    country,
                    network: networkId,
                    email: emailAddress,
                            customId: transactionId,
                            transactionHash: paymentResult.transactionHash,
                            expectedAmount: paymentResult.convertedAmount,
                            paymentToken: paymentResult.paymentToken
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
                            transactionHash: paymentResult.transactionHash,
                            expectedAmount: paymentResult.convertedAmount,
                            paymentToken: paymentResult.paymentToken
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

                // Show success message
                const successMessage = serviceType === 'data' 
                    ? `Successfully claimed data bundle for ${phoneNumber}!`
                    : `Successfully claimed airtime for ${phoneNumber}!`;
                
                toast.success(successMessage);

            } catch (error) {
                console.error("Error during claim process:", error);
                
                // Find the current loading step and mark it as error
                const loadingStepIndex = transactionSteps.findIndex(step => step.status === 'loading');
                if (loadingStepIndex !== -1) {
                    updateStepStatus(
                        transactionSteps[loadingStepIndex].id,
                        'error',
                        error instanceof Error ? error.message : 'Unknown error'
                    );
                }
                
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                toast.error(`Claim failed: ${errorMessage}`);
                
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

            // Mark as successfully claimed and update state
            setCanClaimToday(false);

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
        loadingWhitelist,
        canClaimToday,
        timeRemaining,
        serviceType,
        setServiceType,

        // Data
        networks,
        availablePlans,
        selectedPlan,

        // Functions
        setCountryCurrency,
        onSubmit
    };
};
