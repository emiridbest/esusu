"use client";

import React, { useState, useContext, createContext, ReactNode, useEffect, useRef, useCallback } from 'react';
import { encodeFunctionData, parseAbi, formatUnits } from 'viem';
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { celo } from 'viem/chains';
import { toast } from 'sonner';
import { useIdentitySDK, useClaimSDK } from "@goodsdks/react-hooks";
import { isSupportedChain, CHAIN_DECIMALS, SupportedChains } from "@goodsdks/citizen-sdk";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TransactionSteps, Step, StepStatus } from '@/components/TransactionSteps';
import { payAddress, payABI } from '@/utils/pay';
import useGasSponsorship from '@/hooks/useGasSponsorship';

const TOKENS = {
  'G$': { address: '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A', decimals: 18 }
};

const getTokenAddress = (token: string, tokens: typeof TOKENS): string =>
  (tokens as any)[token]?.address || '';

const ubiSchemeV2Address = '0x43d72Ff17701B2DA814620735C39C620Ce0ea4A1';
const ubiSchemeV2ABI = parseAbi([
  "function claim() returns (bool)",
  "function checkEntitlement(address _member) view returns (uint256)",
  "function getDailyStats() view returns (uint256 claimers, uint256 amount)",
  "function periodStart() view returns (uint256)",
  "function currentDay() view returns (uint256)",
  "event UBIClaimed(address indexed account, uint256 amount)",
]);

type ClaimProcessorType = {
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  entitlement: bigint | null;
  canClaim: boolean;
  handleClaim: () => Promise<{ success: boolean; error?: any }>;
  processDataTopUp: (values: any, selectedPrice: number, availablePlans: any[], networks: any[]) => Promise<{ success: boolean; error?: any }>;
  processAirtimeTopUp: (values: any, selectedPrice: number) => Promise<{ success: boolean; error?: any }>;
  processPayment: () => Promise<any>;
  TOKENS: typeof TOKENS;
  isTransactionDialogOpen: boolean;
  setIsTransactionDialogOpen: (open: boolean) => void;
  setTransactionSteps: (steps: Step[]) => void;
  setCurrentOperation: (operation: 'data' | 'airtime' | null) => void;
  isWaitingTx?: boolean;
  setIsWaitingTx?: (waiting: boolean) => void;
  closeTransactionDialog: () => void;
  openTransactionDialog: (operation: 'data' | 'airtime', recipientValue: string) => void;
  transactionSteps: Step[];
  currentOperation: "data" | "airtime" | null;
  updateStepStatus: (stepId: string, status: StepStatus, errorMessage?: string) => void;
  handleVerification: () => Promise<void>;
  isWhitelisted: boolean;
  checkingWhitelist: boolean;
  claimAmount: number | null;
  altClaimAvailable: boolean;
  altChainId: SupportedChains | null;
};

const ClaimProcessorContext = createContext<ClaimProcessorType | undefined>(undefined);

export function ClaimProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const { data: walletClient } = useWalletClient({ chainId });
  const { checkAndSponsor } = useGasSponsorship();

  const [isProcessing, setIsProcessing] = useState(false);
  const [entitlement, setEntitlement] = useState<bigint | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState<Step[]>([]);
  const [currentOperation, setCurrentOperation] = useState<'data' | 'airtime' | null>(null);
  const [isWaitingTx, setIsWaitingTx] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [claimSDK, setClaimSDK] = useState<any>(null);
  const [checkingWhitelist, setCheckingWhitelist] = useState(true);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [claimAmount, setClaimAmount] = useState<number | null>(null);
  const [altClaimAvailable, setAltClaimAvailable] = useState(false);
  const [altChainId, setAltChainId] = useState<SupportedChains | null>(null);

  const initializationAttempted = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;
  const closeDialogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingWhitelistCheckRef = useRef<Promise<boolean> | null>(null);
  const pendingEntitlementCheckRef = useRef<Promise<any> | null>(null);
  const lastCheckedAddressRef = useRef<string | null>(null);

  const { sdk: identitySDK } = useIdentitySDK("production");
  const { sdk: ClaimSDK, loading: claimSDKLoading, error: claimSDKError } = useClaimSDK("production");

  // Reset on chain change
  useEffect(() => {
    setClaimSDK(null);
    initializationAttempted.current = false;
    retryCount.current = 0;
  }, [chainId]);

  // Whitelist check
  useEffect(() => {
    const checkWhitelistStatus = async () => {
      if (!identitySDK || !address) { setCheckingWhitelist(false); return; }
      if (lastCheckedAddressRef.current === address && pendingWhitelistCheckRef.current) {
        const result = await pendingWhitelistCheckRef.current;
        setIsWhitelisted(result); setCheckingWhitelist(false); return;
      }
      lastCheckedAddressRef.current = address;
      setCheckingWhitelist(true);
      const promise = (async () => {
        try {
          const result = await identitySDK.getWhitelistedRoot(address as `0x${string}`);
          const whitelisted = result?.isWhitelisted === true;
          setIsWhitelisted(whitelisted);
          return whitelisted;
        } catch { setIsWhitelisted(false); return false; }
        finally { setCheckingWhitelist(false); pendingWhitelistCheckRef.current = null; }
      })();
      pendingWhitelistCheckRef.current = promise;
      await promise;
    };
    checkWhitelistStatus();
  }, [identitySDK, address]);

  // Reset on disconnect
  useEffect(() => {
    if (!isConnected) {
      initializationAttempted.current = false;
      setClaimSDK(null); setEntitlement(null); setCanClaim(false);
      setClaimAmount(null); setAltClaimAvailable(false); setAltChainId(null);
    }
  }, [isConnected]);

  // Initialize ClaimSDK
  useEffect(() => {
    const initializeSDK = async () => {
      if (isInitializing || initializationAttempted.current || claimSDKLoading || !ClaimSDK || !chainId || !isConnected || !address || !publicClient || !walletClient) return;
      if (pendingEntitlementCheckRef.current) { await pendingEntitlementCheckRef.current; return; }
      setIsInitializing(true);
      initializationAttempted.current = true;
      const promise = (async () => {
        try {
          if (!isSupportedChain(chainId)) throw new Error(`Unsupported chain: ${chainId}`);
          const { amount, altClaimAvailable, altChainId: altChain } = await ClaimSDK.checkEntitlement();
          setEntitlement(amount);
          const decimals = CHAIN_DECIMALS[chainId as SupportedChains];
          const formatted = formatUnits(amount, decimals);
          const rounded = Math.round((Number(formatted) + Number.EPSILON) * 100) / 100;
          setClaimAmount(rounded);
          setAltClaimAvailable(altClaimAvailable);
          setAltChainId(altClaimAvailable ? (altChain ?? null) : null);
          setClaimSDK(ClaimSDK);
          setCanClaim(amount > BigInt(0));
        } catch (error) {
          console.error("Error initializing ClaimSDK:", error);
          retryCount.current += 1;
          if (retryCount.current < MAX_RETRIES) {
            initializationAttempted.current = false;
            setTimeout(() => setIsInitializing(false), Math.pow(2, retryCount.current) * 1000);
            return;
          }
          setClaimAmount(null); setCanClaim(false);
        } finally {
          setIsInitializing(false);
          pendingEntitlementCheckRef.current = null;
        }
      })();
      pendingEntitlementCheckRef.current = promise;
      await promise;
    };
    if (claimSDKError) { 
      console.error("ClaimSDK error:", claimSDKError); 
      setIsInitializing(false); }
    else if (!claimSDKLoading && ClaimSDK) initializeSDK();
  }, [isConnected, address, publicClient, walletClient, chainId, ClaimSDK, claimSDKLoading, claimSDKError]);

  useEffect(() => {
    return () => { if (closeDialogTimeoutRef.current) clearTimeout(closeDialogTimeoutRef.current); };
  }, []);

  const handleVerification = useCallback(async () => {
    try {
      const fvLink = await identitySDK.generateFVLink(false, window.location.href);
      try {
        await fetch('/api/verification/track', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, timestamp: new Date().toISOString(), success: true, extra: { redirectedTo: fvLink } })
        });
      } catch { }
      window.location.href = fvLink;
    } catch (err) {
      console.error("Error generating verification link:", err);
      toast.error("Failed to generate verification link");
    }
  }, [identitySDK, address]);

  const updateStepStatus = useCallback((stepId: string, status: StepStatus, errorMessage?: string) => {
    setTransactionSteps(prev => {
      const step = prev.find(s => s.id === stepId);
      if (step?.status === status && step?.errorMessage === errorMessage) return prev;
      return prev.map(s => s.id === stepId ? { ...s, status, ...(errorMessage ? { errorMessage } : {}) } : s);
    });
  }, []);

  // ── handleClaim ───────────────────────────────────────────────────────────
  const handleClaim = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error("Wallet not connected");
      return { success: false, error: new Error("Wallet not connected") };
    }
    setIsProcessing(true); setIsWaitingTx(true);
    try {
      toast.info("Claiming your UBI...");

      // Gas sponsorship
      try {
        const s = await checkAndSponsor(address as `0x${string}`, {
          contractAddress: ubiSchemeV2Address as `0x${string}`,
          abi: ubiSchemeV2ABI, functionName: 'claim', args: [],
        });
        if (s.gasSponsored) { toast.success(`Gas sponsored: ${s.amountSponsored} ${s.sponsoredToken || 'CELO'}`); await new Promise(r => setTimeout(r, 3000)); }
      } catch { /* continue */ }

      const tx = await claimSDK.claim();
      const claimTxHash: `0x${string}` = tx.transactionHash;

      const receipt = await publicClient.waitForTransactionReceipt({ hash: claimTxHash });
      if (receipt.status !== 'success') throw new Error("Transaction failed");

      try {
        await fetch('/api/ubi-claim', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address, token: 'G$' }),
        });
      } catch { }

      setClaimAmount(null); setEntitlement(BigInt(0)); setCanClaim(false);
      toast.success("Successfully claimed G$ tokens!");
      return { success: true, transactionHash: claimTxHash };
    } catch (error) {
      console.error("Error during claim:", error);
      toast.error(error instanceof Error ? error.message : "Error processing your claim.");
      return { success: false, error };
    } finally {
      setIsProcessing(false); setIsWaitingTx(false);
    }
  }, [isConnected, address, claimSDK, checkAndSponsor, publicClient, walletClient]);

  // ── processPayment (wagmi/viem only) ──────────────────────────────────────
  const processPayment = useCallback(async () => {
    if (!isConnected || !address || !walletClient || !publicClient) throw new Error("Wallet not connected");
    if (!entitlement || entitlement <= BigInt(0)) throw new Error("No entitlement available");

    const selectedToken = "G$";
    const tokenAddress = getTokenAddress(selectedToken, TOKENS) as `0x${string}`;

    const erc20Abi = parseAbi([
      "function transfer(address to, uint256 value) returns (bool)",
      "function approve(address spender, uint256 value) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)"
    ]);

    toast.info("Processing payment for data bundle...");

    try {
      setIsWaitingTx(true);

      // Check allowance
      const currentAllowance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address as `0x${string}`, payAddress as `0x${string}`],
        authorizationList: undefined
      });

      if ((currentAllowance as bigint) < entitlement) {
        const approveAmount = entitlement * BigInt(100);

        // Gas sponsorship for approval
        try {
          const s = await checkAndSponsor(address as `0x${string}`, {
            contractAddress: tokenAddress,
            abi: erc20Abi, functionName: 'approve',
            args: [payAddress as `0x${string}`, approveAmount],
          });
          if (s.gasSponsored) { toast.success(`Gas sponsored for approval: ${s.amountSponsored} ${s.sponsoredToken || 'CELO'}`); await new Promise(r => setTimeout(r, 6000)); }
        } catch { /* continue */ }

        const approveTxHash = await walletClient.writeContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [payAddress as `0x${string}`, approveAmount],
          account: address as `0x${string}`,
          chain: celo,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
        toast.success('Token approval confirmed');
      }

      // Gas sponsorship for pay
      try {
        const s = await checkAndSponsor(address as `0x${string}`, {
          contractAddress: payAddress as `0x${string}`,
          abi: payABI, functionName: 'pay',
          args: [tokenAddress, entitlement],
        });
        if (s.gasSponsored) { toast.success(`Gas sponsored: ${s.amountSponsored} ${s.sponsoredToken || 'CELO'}`); await new Promise(r => setTimeout(r, 6000)); }
      } catch { /* continue */ }

      const txHash = await walletClient.writeContract({
        address: payAddress as `0x${string}`,
        abi: payABI,
        functionName: 'pay',
        args: [tokenAddress, entitlement],
        account: address as `0x${string}`,
        chain: celo,
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      toast.success("Payment confirmed on-chain. Processing data top-up...");

      const convertedAmount = formatUnits(entitlement, 18);
      return { transactionHash: txHash, convertedAmount, paymentToken: selectedToken };
    } catch (error) {
      console.error("Payment transaction failed:", error);
      toast.error("Payment transaction failed. Please try again.");
      const failing = transactionSteps.find(s => s.status === 'loading');
      if (failing) updateStepStatus(failing.id, 'error', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    } finally {
      setIsWaitingTx(false);
    }
  }, [isConnected, address, walletClient, publicClient, entitlement, transactionSteps, updateStepStatus, checkAndSponsor]);

  // ── processDataTopUp / processAirtimeTopUp ────────────────────────────────
  const processDataTopUp = useCallback(async (values: any, selectedPrice: number, availablePlans: any[], networks: any[]) => {
    if (!values?.phoneNumber || !values?.country || !values?.network) {
      toast.error("Please ensure all required fields are filled out."); return { success: false };
    }
    try {
      const res = await fetch('/api/topup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorId: values.network, amount: selectedPrice.toString(),
          customId: values.customId, transactionHash: values.transactionHash,
          expectedAmount: values.expectedAmount, paymentToken: values.paymentToken,
          serviceType: 'data', recipientPhone: { country: values.country, phoneNumber: values.phoneNumber.replace(/[\s\-\+]/g, '') },
          email: values.email, isFreeClaim: true
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Successfully topped up ${values.phoneNumber} with ${availablePlans[0]?.name || 'your selected plan'}.`);
        return { success: true };
      }
      toast.error(data.error || "There was an issue processing your top-up.");
      return { success: false, error: data.error };
    } catch (error) {
      toast.error("Error processing your top-up.");
      return { success: false, error };
    }
  }, []);

  const processAirtimeTopUp = useCallback(async (values: any, selectedPrice: number) => {
    if (!values?.phoneNumber || !values?.country || !values?.network) {
      toast.error("Please ensure all required fields are filled out."); return { success: false };
    }
    try {
      const res = await fetch('/api/topup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorId: values.network, amount: selectedPrice.toString(),
          customId: values.customId, transactionHash: values.transactionHash,
          expectedAmount: values.expectedAmount, paymentToken: values.paymentToken,
          serviceType: 'airtime', recipientPhone: { country: values.country, phoneNumber: values.phoneNumber.replace(/[\s\-\+]/g, '') },
          email: values.email, isFreeClaim: true
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Successfully topped up ${values.phoneNumber} with ₦${selectedPrice}.`);
        return { success: true };
      }
      toast.error(data.error || "There was an issue processing your top-up.");
      return { success: false, error: data.error };
    } catch (error) {
      toast.error("Error processing your top-up.");
      return { success: false, error };
    }
  }, []);

  // ── Dialog helpers ────────────────────────────────────────────────────────
  const openTransactionDialog = useCallback((operation: 'data' | 'airtime', recipientValue: string) => {
    setCurrentOperation(operation);
    setRecipient(recipientValue);
    setIsTransactionDialogOpen(true);

    const inactive = (id: string, title: string, description: string): Step => ({ id, title, description, status: 'inactive' });
    const steps: Step[] = [
      inactive('verify-phone', 'Verify Phone Number', `Verifying phone number for ${recipientValue}`),
      inactive('claim-ubi', 'Claim UBI', 'Claiming Universal Basic Income'),
      inactive('payment', 'Payment', 'Waiting for on-chain confirmation...'),
      inactive('top-up', 'Perform Top Up', `Confirming ${operation} purchase for ${recipientValue}`),
    ];
    setTransactionSteps(steps);
  }, []);

  const closeTransactionDialog = useCallback(() => {
    setIsTransactionDialogOpen(false);
    setCurrentOperation(null);
    if (closeDialogTimeoutRef.current) clearTimeout(closeDialogTimeoutRef.current);
    closeDialogTimeoutRef.current = setTimeout(() => { setTransactionSteps([]); setRecipient(''); }, 300);
  }, []);

  const getDialogTitle = useCallback(() => {
    switch (currentOperation) {
      case 'data': return 'Purchase Data Bundle';
      case 'airtime': return 'Purchase Airtime';
      default: return 'Transaction';
    }
  }, [currentOperation]);

  const allStepsCompleted = transactionSteps.every(s => s.status === 'success');
  const hasError = transactionSteps.some(s => s.status === 'error');

  const value: ClaimProcessorType = {
    isProcessing, setIsProcessing, entitlement, canClaim,
    handleClaim, processDataTopUp, processAirtimeTopUp, processPayment,
    TOKENS, setTransactionSteps, setCurrentOperation, setIsTransactionDialogOpen,
    isTransactionDialogOpen, isWaitingTx, setIsWaitingTx,
    closeTransactionDialog, openTransactionDialog,
    transactionSteps, currentOperation, updateStepStatus,
    handleVerification, isWhitelisted, checkingWhitelist,
    claimAmount, altClaimAvailable, altChainId,
  };

  return (
    <ClaimProcessorContext.Provider value={value}>
      {children}
      <Dialog open={isTransactionDialogOpen} onOpenChange={(open) => !isWaitingTx && !open && closeTransactionDialog()}>
        <DialogContent className="sm:max-w-md border rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-black/90 dark:text-white/90">{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              {currentOperation === 'data' && recipient ? `Processing data top-up for ${recipient}` : ''}
            </DialogDescription>
          </DialogHeader>
          <TransactionSteps steps={transactionSteps} />
          <DialogFooter className="flex justify-between text-black/90 dark:text-white/90">
            <Button variant="outline" onClick={closeTransactionDialog} disabled={isWaitingTx && !hasError}>
              {hasError ? 'Close' : allStepsCompleted ? 'Done' : 'Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClaimProcessorContext.Provider>
  );
}

export function useClaimProcessor(): ClaimProcessorType {
  const context = useContext(ClaimProcessorContext);
  if (!context) throw new Error("useClaimProcessor must be used within a ClaimProvider");
  return context;
}