// hooks/useFreebiesLogic.js
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
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
import { useIdentitySDK } from '@goodsdks/identity-sdk';

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
    const { address, isConnected } = useAccount();
    const {
        updateStepStatus,
        openTransactionDialog,
        isProcessing,
        setIsProcessing,
        handleClaim,
        processDataTopUp,
        processPayment
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

    const identitySDK = useIdentitySDK("production");

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
        console.log("Setting country currency for:", country);
    };

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
                    const { isWhitelisted } =
                        (await identitySDK?.getWhitelistedRoot(address)) ?? {};

                    setIsWhitelisted(isWhitelisted);
                    setIsVerified(isWhitelisted ?? false);
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
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
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
    const handleClaimBundle = async (values: z.infer<typeof formSchema>) => {
        const phoneNumber = values.phoneNumber;
        const country = values.country;
        const emailAddress = values.email;
        const networkId = values.network;
        const selectedPlan = availablePlans.find(plan => plan.id === values.plan) || null;

        try {
            if (!isConnected || !selectedPlan || !phoneNumber) {
                toast.error("Please connect your wallet, select a bundle and enter your phone number");
                return;
            }

            setIsVerifying(true);
            openTransactionDialog('data', phoneNumber)
            updateStepStatus('verify-phone-number', 'loading');

            const verificationResult = await verifyAndSwitchProvider(phoneNumber, networkId, country);

            if (verificationResult.verified) {
                setIsVerified(true);
                toast.success("Phone number verified successfully");

                if (verificationResult.autoSwitched && verificationResult.correctProviderId) {
                    form.setValue('network', verificationResult.correctProviderId);
                    toast.success(verificationResult.message);

                    const plans = await fetchDataPlans(verificationResult.correctProviderId, country);
                    setAvailablePlans(plans);
                } else {
                    toast.success("You are now using the correct network provider.");
                }
            } else {
                setIsVerified(false);
                toast.error("Phone number verification failed. Please double-check the phone number.");
                setIsProcessing(false);
                return;
            }
        } catch (error) {
            console.error("Error during verification:", error);
            setIsProcessing(false);
            updateStepStatus('verify-phone-number', 'error', "Phone number and network selected do not match. Please try again.");
            return;
        } finally {
            setIsVerifying(false);
        }
        updateStepStatus('verify-phone', 'success');


        setIsClaiming(true);
        setIsProcessing(true);
        updateStepStatus('claim-ubi', 'loading');
        try {
            await handleClaim();
            updateStepStatus('claim-ubi', 'success');
            toast.success("Claim successful! Your data bundle will be activated shortly.");
        } catch (error) {
            console.error("Claim failed:", error);
            toast.error("Failed to claim your free data bundle. Please try again.");
            updateStepStatus('claim-ubi', 'error', "An error occurred during the claim process.");
            setIsClaiming(false);
            setIsProcessing(false);
            return;
        }
        try {
            await processPayment();
        } catch (error) {
            console.error("Payment processing failed:", error);
            toast.error("Failed to process payment. Please try again.");
            updateStepStatus('payment', 'error', "An error occurred during the payment process.");
            setIsClaiming(false);
        }
        try {
            const selectedPrice = parseFloat(selectedPlan.price.replace(/[^0-9.]/g, ''));
            const networks = [{ id: networkId, name: 'Network' }];
            updateStepStatus('top-up', 'loading');
            const topupResult = await processDataTopUp(
                {
                    phoneNumber,
                    country,
                    network: networkId,
                    email: emailAddress
                },
                selectedPrice,
                availablePlans,
                networks
            );

            if (topupResult.success) {
                localStorage.setItem('lastFreeClaim', new Date().toDateString());
                setCanClaimToday(false);
                setSelectedPlan(null);
                updateStepStatus('top-up', 'success');
                form.reset();
            }
        } catch (error) {
            console.error("Claim failed:", error);
            toast.error("Failed to claim your free data bundle. Please try again.");
            updateStepStatus('claim-ubi', 'error', error instanceof Error ? error.message : "Unknown error");
        } finally {
            setIsClaiming(false);
            setIsProcessing(false);
        }
    };

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
        handleClaimBundle
    };
};