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
import { z } from "zod";
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
        processPayment,
        entitlement,
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

    // Function to set country currency
    const setCountryCurrency = (country: string) => {
    };

    // Fetch network providers when country changes
    useEffect(() => {
        const getNetworks = async () => {
            if (watchCountry) {
                setIsLoading(true);
                form.setValue("network", "");
                form.setValue("plan", "");

                try {
                    // Use the existing utility service function instead of direct fetch
                    const operators = await fetchMobileOperators(watchCountry);
                    // Filter out MTN Nigeria extra data and Smile Uganda data
                    const filteredOperators = operators.filter(operator => 
                        !(operator.name.toLowerCase().includes('mtn nigeria extra data') ||
                        operator.name.toLowerCase().includes('smile uganda data'))
                    );
                    setNetworks(filteredOperators);
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
                    setAvailablePlans([plans[0]]);
                    setSelectedPlan(plans[0]);
                    setNetworkId(watchNetwork);
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
  // Handle claim bundle logic - Corrected version
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
        
        if (!selectedPlan) {
            toast.error("Please select a data plan");
            return;
        }
        
        if (!phoneNumber) {
            toast.error("Please enter your phone number");
            return;
        }

        // Validate selectedPlan has required properties
        if (!selectedPlan.price || typeof selectedPlan.price !== 'string') {
            toast.error("Invalid data plan selected. Please try selecting a different plan.");
            return;
        }

        // Set early localStorage to prevent rapid duplicate submissions
        if (typeof window !== 'undefined') {
            localStorage.setItem('processingClaim', transactionId);
        }

        setIsVerifying(true);

        try {
            openTransactionDialog('data', phoneNumber);
            updateStepStatus('verify-phone', 'loading');
            
            const verificationResult = await verifyAndSwitchProvider(phoneNumber, networkId, country);

            if (!verificationResult || !verificationResult.verified) {
                setIsVerified(false);
                toast.error("Phone number verification failed. Please double-check the phone number.");
                updateStepStatus('verify-phone', 'error', "Your phone number did not verify with the selected network provider. Please check the number and try again.");
                return;
            }

            setIsVerified(true);
            toast.success("Phone number verified successfully");
            updateStepStatus('verify-phone-number', 'loading');

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
                updateStepStatus('verify-phone', 'success');
                toast.success("You are now using the correct network provider.");
            }
        } catch (verificationError) {
            console.error("Error during verification:", verificationError);
            toast.error(verificationError instanceof Error ? verificationError.message : "There was an unexpected error during verification.");
            updateStepStatus('verify-phone', 'error', "Verification failed. Please try again.");
            return;
        } finally {
            setIsVerifying(false);
        }

        // Start claiming process
        setIsClaiming(true);
        updateStepStatus('claim-ubi', 'loading');
        
        try {
            await handleClaim();
            hasClaimedSuccessfully = true;
            updateStepStatus('claim-ubi', 'success');
            toast.success("Claim successful! Your data bundle will be activated shortly.");
        } catch (claimError) {
            console.error("Claim failed:", claimError);
            toast.error("Failed to claim your free data bundle. Please try again.");
            updateStepStatus('claim-ubi', 'error', "An error occurred during the claim process.");
            return;
        }

        // ...existing code...

        // Process payment
        updateStepStatus('payment', 'loading');
        let transactionHash: string | null = null;
        try {
            const tx = await processPayment();
            transactionHash = tx?.transactionHash || null;
            setTxID(transactionHash || null);
            updateStepStatus('payment', 'success');
        } catch (paymentError) {
            console.error("Payment processing failed:", paymentError);
            toast.error("Failed to process payment. Please try again.");
            updateStepStatus('payment', 'error', "An error occurred during the payment process.");
            return;
        }

        // Process data top-up
        try {
            const selectedPrice = parseFloat(selectedPlan.price.replace(/[^0-9.]/g, ''));
            
            // Validate parsed price
            if (isNaN(selectedPrice) || selectedPrice <= 0) {
                throw new Error("Invalid plan price");
            }

            // Ensure we have a valid transaction hash
            if (!transactionHash) {
                throw new Error("Transaction hash is required for topup");
            }

            const networks = [{ id: networkId, name: 'Network' }];
            // Derive expectedAmount from entitlement (bigint base units) to human-readable decimal string
            const expectedAmount = entitlement ? formatUnits(entitlement as bigint, 18) : selectedPrice.toString();
            const paymentToken = 'G$';
            updateStepStatus('top-up', 'loading');
            
            const topupResult = await processDataTopUp(
                {
                    phoneNumber,
                    country,
                    network: networkId,
                    email: emailAddress,
                    customId: transactionHash, // Use the transactionHash instead of txID
                    transactionHash,
                    expectedAmount,
                    paymentToken,
                },
                selectedPrice,
                availablePlans,
                networks
            );
            
            // ...rest of the code...
                setCanClaimToday(false);

            if (topupResult && topupResult.success) {
                // Only set localStorage after successful topup
                if (typeof window !== 'undefined') {
                    localStorage.setItem('lastFreeClaim', new Date().toDateString());
                    localStorage.removeItem('processingClaim'); 
                }
                
                setSelectedPlan(null);
                updateStepStatus('top-up', 'success');
                form.reset();
                closeTransactionDialog()
                toast.success("Data bundle topped up successfully! You can claim again tomorrow.");
            } else {
                throw new Error( "Top-up failed - no success confirmation received");
            }
        } catch (topupError) {
            console.error("Top-up failed:", topupError);
            toast.error("Failed to top up your data bundle. Please try again.");
            updateStepStatus('top-up', 'error', "An error occurred during the top-up process.");
            
            // If topup failed but claim succeeded, we might want to handle this differently
            if (hasClaimedSuccessfully) {
                toast.error("Claim succeeded but top-up failed. Please contact support.");
            }
            
            throw topupError; // Re-throw to trigger cleanup in outer catch
        }

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

        // Data
        networks,
        availablePlans,
        selectedPlan,

        // Functions
        setCountryCurrency,
        onSubmit
    };
};
