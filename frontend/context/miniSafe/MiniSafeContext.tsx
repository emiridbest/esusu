"use client";
import React, { createContext, useState, useCallback, useContext, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { contractAddress, abi } from '@/utils/abi';
import { encodeFunctionData, parseAbi, parseUnits, formatUnits, parseEther } from "viem";
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { celo } from 'viem/chains';
import useGasSponsorship from '@/hooks/useGasSponsorship';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TransactionSteps, Step, StepStatus } from '@/components/TransactionSteps';

interface MiniSafeContextType {
  usdcAddress: string;
  cusdAddress: string;
  usdtAddress: string;
  depositAmount: number;
  setDepositAmount: (amount: number) => void;
  withdrawAmount: number;
  setWithdrawAmount: (amount: number) => void;
  cusdBalance: string;
  usdcBalance: string;
  usdtBalance: string;
  selectedToken: string;
  setSelectedToken: (token: string) => void;
  isApproved: boolean;
  setIsApproved: (approved: boolean) => void;
  isApproving: boolean;
  isWaitingTx: boolean;
  isLoading: boolean;
  isTransactionDialogOpen: boolean;
  openTransactionDialog: (operation: 'deposit' | 'withdraw' | 'break' | 'approve' | null) => void;
  closeTransactionDialog: () => void;
  transactionSteps: Step[];
  currentOperation: 'deposit' | 'withdraw' | 'break' | 'approve' | null;
  getBalance: () => Promise<void>;
  handleTokenChange: (value: string) => void;
  approveSpend: () => Promise<void>;
  handleDeposit: () => Promise<void>;
  handleWithdraw: () => Promise<void>;
  handleBreakLock: () => Promise<void>;
  formatBalance: (balance: string, decimals?: number) => string;
}

const MiniSafeContext = createContext<MiniSafeContextType | undefined>(undefined);

export const MiniSafeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const usdcAddress = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
  const cusdAddress = "0x765de816845861e75a25fca122bb6898b8b1282a";
  const usdtAddress = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";

  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [cusdBalance, setcusdBalance] = useState('0');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [usdtBalance, setusdtBalance] = useState('0');
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isWaitingTx, setIsWaitingTx] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState<Step[]>([]);
  const [currentOperation, setCurrentOperation] = useState<'deposit' | 'withdraw' | 'break' | 'approve' | null>(null);

  // ── wagmi/viem hooks ──────────────────────────────────────────────────────
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: 42220 });
  const { data: walletClient } = useWalletClient();
  const { checkAndSponsor } = useGasSponsorship();

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getTokenAddress = (token: string) => {
    switch (token) {
      case 'USDC': return usdcAddress;
      case 'CUSD': return cusdAddress;
      case 'USDT': return usdtAddress;
      default: return usdcAddress;
    }
  };

  const getTokenDecimals = (token: string) => {
    switch (token) {
      case 'USDC':
      case 'USDT': return 6;
      case 'CUSD':
      default: return 18;
    }
  };

  const handleTokenChange = (value: string) => setSelectedToken(value);

  const updateStepStatus = (stepId: string, status: StepStatus, errorMessage?: string) => {
    setTransactionSteps(prev =>
      prev.map(s => s.id === stepId ? { ...s, status, ...(errorMessage ? { errorMessage } : {}) } : s)
    );
  };

  // ── getBalance ────────────────────────────────────────────────────────────
  const getBalance = useCallback(async () => {
    if (!address || !publicClient) return;
    try {
      setIsLoading(true);

      const balanceAbi = parseAbi(["function getBalance(address,address) view returns (uint256)"]);

      const [cusd, usdc, usdt] = await Promise.all([
          publicClient.readContract({
            address: contractAddress, abi: balanceAbi, functionName: 'getBalance', args: [address as `0x${string}`, cusdAddress as `0x${string}`],
            authorizationList: undefined
          }),
          publicClient.readContract({
            address: contractAddress as `0x${string}`, abi: balanceAbi, functionName: 'getBalance', args: [address as `0x${string}`, usdcAddress as `0x${string}`],
            authorizationList: undefined
          }),
        publicClient.readContract({
          address: contractAddress as `0x${string}`, abi: balanceAbi, functionName: 'getBalance', args: [address as `0x${string}`, usdtAddress as `0x${string}`],
          authorizationList: undefined
        }),
      ]);

      setcusdBalance(cusd?.toString() ?? '0');
      setUsdcBalance(usdc?.toString() ?? '0');
      setusdtBalance(usdt?.toString() ?? '0');
    } catch (error) {
      console.error('Error fetching balances:', error);
      setcusdBalance('0'); setUsdcBalance('0'); setusdtBalance('0');
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient, cusdAddress, usdcAddress, usdtAddress]);

  useEffect(() => { if (address) getBalance(); }, [address, getBalance]);

  // ── approveSpend ──────────────────────────────────────────────────────────
  const approveSpend = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      toast.error('Please enter a valid amount'); return;
    }
    if (!address || !walletClient || !publicClient) {
      toast.error('Please connect your wallet'); return;
    }

    openTransactionDialog('approve');
    setIsApproving(true);
    setIsWaitingTx(true);
    updateStepStatus('check-balance', 'loading');
    await getBalance();
    updateStepStatus('check-balance', 'success');

    try {
      const tokenAddr = getTokenAddress(selectedToken) as `0x${string}`;
      const decimals = getTokenDecimals(selectedToken);
      const depositValue = parseUnits(depositAmount.toString(), decimals);

      const tokenAbi = parseAbi([
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ]);

      updateStepStatus('allowance', 'loading');
      const allowanceData = await publicClient.readContract({
        address: tokenAddr,
        abi: tokenAbi,
        functionName: 'allowance',
        args: [address as `0x${string}`, contractAddress as `0x${string}`],
        authorizationList: undefined
      });
      updateStepStatus('allowance', 'success');

      if ((allowanceData as bigint) >= depositValue) {
        setIsApproved(true);
        toast.success('Already approved!');
        updateStepStatus('approve', 'success');
        closeTransactionDialog();
        return;
      }

      updateStepStatus('approve', 'loading');

      // Gas sponsorship (optional)
      try {
        const s = await checkAndSponsor(address as `0x${string}`, {
          contractAddress: tokenAddr,
          abi: tokenAbi,
          functionName: 'approve',
          args: [contractAddress, depositValue],
        });
        if (s.gasSponsored) {
          toast.success(`Gas sponsored: ${s.amountSponsored} ${s.sponsoredToken || 'CELO'}`);
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch { /* continue */ }

      const txHash = await walletClient.writeContract({
        address: tokenAddr,
        abi: tokenAbi,
        functionName: 'approve',
        args: [contractAddress as `0x${string}`, depositValue],
        account: address as `0x${string}`,
        chain: celo,
      });
      updateStepStatus('approve', 'success');
      updateStepStatus('confirm', 'loading');

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setIsApproved(true);
      toast.success('Approval successful!');
      updateStepStatus('confirm', 'success');
    } catch (error) {
      console.error('Error approving spend:', error);
      toast.error('Approval failed!');
      const failing = transactionSteps.find(s => s.status === 'loading');
      updateStepStatus(
        failing?.id ?? 'approve',
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setIsApproving(false);
      setIsWaitingTx(false);
    }
  };

  // ── handleDeposit ─────────────────────────────────────────────────────────
  const handleDeposit = async () => {
    if (!depositAmount || !selectedToken) { toast.error('Please enter an amount and select a token'); return; }
    if (!address || !walletClient || !publicClient) { toast.error('Please connect your wallet'); return; }

    openTransactionDialog('deposit');
    setIsWaitingTx(true);

    try {
      updateStepStatus('check-balance', 'loading');
      const tokenAddr = getTokenAddress(selectedToken) as `0x${string}`;
      const decimals = getTokenDecimals(selectedToken);
      const depositValue = parseUnits(depositAmount.toString(), decimals);

      await getBalance();
      updateStepStatus('check-balance', 'success');
      updateStepStatus('approve', 'loading');

      const tokenAbi = parseAbi([
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ]);

      const allowanceData = await publicClient.readContract({
        address: tokenAddr,
        abi: tokenAbi,
        functionName: 'allowance',
        args: [address as `0x${string}`, contractAddress as `0x${string}`],
        authorizationList: undefined
      });

      if ((allowanceData as bigint) < depositValue) {
        // Needs approval first
        try {
          const s = await checkAndSponsor(address as `0x${string}`, {
            contractAddress: tokenAddr, abi: tokenAbi,
            functionName: 'approve', args: [contractAddress, depositValue],
          });
          if (s.gasSponsored) { toast.success(`Gas sponsored: ${s.amountSponsored} ${s.sponsoredToken || 'CELO'}`); await new Promise(r => setTimeout(r, 3000)); }
        } catch { /* continue */ }

        const approveTxHash = await walletClient.writeContract({
          address: tokenAddr, abi: tokenAbi, functionName: 'approve',
          args: [contractAddress as `0x${string}`, depositValue],
          account: address as `0x${string}`, chain: celo,
        });
        await publicClient.waitForTransactionReceipt( { hash: approveTxHash });
      }
      updateStepStatus('approve', 'success');
      updateStepStatus('deposit', 'loading');

      // Gas sponsorship for deposit
      try {
        const s = await checkAndSponsor(address as `0x${string}`, {
          contractAddress: contractAddress as `0x${string}`,
          abi: parseAbi(["function deposit(address, uint256)"]),
          functionName: 'deposit', args: [tokenAddr, depositValue],
        });
        if (s.gasSponsored) { toast.success(`Gas sponsored: ${s.amountSponsored} ${s.sponsoredToken || 'CELO'}`); await new Promise(r => setTimeout(r, 3000)); }
      } catch { /* continue */ }

      const depositTxHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: abi as any,
        functionName: 'deposit',
        args: [tokenAddr, depositValue],
        account: address as `0x${string}`,
        chain: celo,
      });
      updateStepStatus('deposit', 'success');
      updateStepStatus('confirm', 'loading');

      const receipt = await publicClient.waitForTransactionReceipt( { hash: depositTxHash });
      if (receipt.status === 'success') {
        await getBalance();
        setDepositAmount(0);
        setIsApproved(false);
        updateStepStatus('confirm', 'success');
        toast.success('Deposit successful!');
      } else {
        updateStepStatus('confirm', 'error', 'Transaction failed on blockchain');
        toast.error('Deposit failed!');
      }
    } catch (error) {
      console.error('Error making deposit:', error);
      toast.error('Deposit failed!');
      const failing = transactionSteps.find(s => s.status === 'loading');
      updateStepStatus(failing?.id ?? 'confirm', 'error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsWaitingTx(false);
    }
  };

  // ── handleWithdraw ────────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    if (!selectedToken) { toast.error('Please select a token'); return; }
    if (!address || !walletClient || !publicClient) { toast.error('Please connect your wallet'); return; }

    openTransactionDialog('withdraw');
    setIsWaitingTx(true);

    try {
      updateStepStatus('check-balance', 'loading');
      const tokenAddr = getTokenAddress(selectedToken) as `0x${string}`;

      const rawBalance = selectedToken === 'CUSD' ? cusdBalance : selectedToken === 'USDC' ? usdcBalance : usdtBalance;
      const withdrawalValue = parseEther(rawBalance.toString());

      await getBalance();
      updateStepStatus('check-balance', 'success');
      updateStepStatus('withdraw', 'loading');

      try {
        const s = await checkAndSponsor(address as `0x${string}`, {
          contractAddress: contractAddress as `0x${string}`,
          abi: parseAbi(["function withdraw(address, uint256)"]),
          functionName: 'withdraw', args: [tokenAddr, withdrawalValue],
        });
        if (s.gasSponsored) { toast.success(`Gas sponsored: ${s.amountSponsored} ${s.sponsoredToken || 'CELO'}`); await new Promise(r => setTimeout(r, 3000)); }
      } catch { /* continue */ }

      const txHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: abi as any,
        functionName: 'withdraw',
        args: [tokenAddr, withdrawalValue],
        account: address as `0x${string}`,
        chain: celo,
      });
      updateStepStatus('withdraw', 'success');
      updateStepStatus('confirm', 'loading');

      const receipt = await publicClient.waitForTransactionReceipt( { hash: txHash });
      if (receipt.status === 'success') {
        updateStepStatus('confirm', 'success');
        await getBalance();
        toast.success('Withdrawal successful!');
      } else {
        updateStepStatus('confirm', 'error', 'Transaction failed on blockchain');
        toast.error('Withdrawal failed!');
      }
    } catch (error) {
      console.error('Error making withdrawal:', error);
      toast.error('Withdrawal failed!');
      const failing = transactionSteps.find(s => s.status === 'loading');
      updateStepStatus(failing?.id ?? 'confirm', 'error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsWaitingTx(false);
    }
  };

  // ── handleBreakLock ───────────────────────────────────────────────────────
  const handleBreakLock = async () => {
    if (!address || !walletClient || !publicClient) { toast.error('Please connect your wallet'); return; }

    openTransactionDialog('break');
    setIsWaitingTx(true);

    try {
      updateStepStatus('check-balance', 'loading');
      const tokenAddr = getTokenAddress(selectedToken) as `0x${string}`;
      await getBalance();
      updateStepStatus('check-balance', 'success');
      updateStepStatus('break', 'loading');

      try {
        const s = await checkAndSponsor(address as `0x${string}`, {
          contractAddress: contractAddress as `0x${string}`,
          abi: parseAbi(["function breakTimelock(address)"]),
          functionName: 'breakTimelock', args: [tokenAddr],
        });
        if (s.gasSponsored) { toast.success(`Gas sponsored: ${s.amountSponsored} ${s.sponsoredToken || 'CELO'}`); await new Promise(r => setTimeout(r, 3000)); }
      } catch { /* continue */ }

      const txHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: abi as any,
        functionName: 'breakTimelock',
        args: [tokenAddr],
        account: address as `0x${string}`,
        chain: celo,
      });

      toast.info('Waiting for confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt( { hash: txHash });

      if (receipt.status === 'success') {
        toast.success('Timelock broken successfully!');
        updateStepStatus('break', 'success');
        updateStepStatus('confirm', 'loading');
        updateStepStatus('confirm', 'success');
        await getBalance();
      } else {
        updateStepStatus('break', 'error', 'Transaction failed on blockchain');
        toast.error('Transaction failed');
      }
    } catch (error) {
      console.error('Error breaking timelock:', error);
      toast.error('Error breaking timelock');
      const failing = transactionSteps.find(s => s.status === 'loading');
      updateStepStatus(failing?.id ?? 'confirm', 'error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsWaitingTx(false);
    }
  };

  // ── Dialog helpers ────────────────────────────────────────────────────────
  const openTransactionDialog = (operation: 'deposit' | 'withdraw' | 'break' | 'approve' | null) => {
    setCurrentOperation(operation);
    setIsTransactionDialogOpen(true);

    const inactive = (id: string, title: string, description: string): Step => ({ id, title, description, status: 'inactive' });
    let steps: Step[] = [];

    if (operation === 'deposit') {
      steps = [
        inactive('check-balance', 'Check Balance', 'Checking your wallet balance...'),
        inactive('approve', 'Approve', `Allowing safe to use your ${selectedToken}...`),
        inactive('deposit', 'Deposit', `Depositing ${depositAmount} ${selectedToken} into the safe...`),
        inactive('confirm', 'Confirm', 'Confirming transaction on the blockchain...'),
      ];
    } else if (operation === 'withdraw') {
      steps = [
        inactive('check-balance', 'Check Balance', 'Checking your safe balance...'),
        inactive('withdraw', 'Withdraw', `Withdrawing your ${selectedToken} from the safe...`),
        inactive('confirm', 'Confirm', 'Confirming transaction on the blockchain...'),
      ];
    } else if (operation === 'break') {
      steps = [
        inactive('check-balance', 'Check Balance', 'Checking your safe balance...'),
        inactive('break', 'Break Timelock', 'Requesting to break timelock...'),
        inactive('confirm', 'Confirm', 'Confirming transaction on the blockchain...'),
      ];
    } else if (operation === 'approve') {
      steps = [
        inactive('check-balance', 'Check Balance', 'Checking your token balance...'),
        inactive('allowance', 'Allowance', `Checking allowance for ${selectedToken}...`),
        inactive('approve', 'Approve', `Allowing safe to use your ${selectedToken}...`),
        inactive('confirm', 'Confirm', 'Confirming transaction on the blockchain...'),
      ];
    }
    setTransactionSteps(steps);
  };

  const closeTransactionDialog = () => {
    setIsTransactionDialogOpen(false);
    setCurrentOperation(null);
    setTimeout(() => setTransactionSteps([]), 300);
  };

  // Auto-close on completion/error
  useEffect(() => {
    if (!isTransactionDialogOpen) return;
    const allDone = transactionSteps.length > 0 && transactionSteps.every(s => s.status === 'success');
    const anyError = transactionSteps.some(s => s.status === 'error');
    if (!isWaitingTx && (allDone || anyError)) {
      const t = setTimeout(closeTransactionDialog, 1000);
      return () => clearTimeout(t);
    }
  }, [isTransactionDialogOpen, isWaitingTx, transactionSteps]);

  // Timeout safety
  useEffect(() => {
    if (!isTransactionDialogOpen || !isWaitingTx) return;
    const timeoutMs = parseInt(process.env.NEXT_PUBLIC_TX_TIMEOUT_MS || '120000', 10);
    const t = setTimeout(() => {
      setTransactionSteps(prev => {
        const loading = [...prev].reverse().find(s => s.status === 'loading');
        if (!loading) return prev;
        return prev.map(s => s.id === loading.id ? { ...s, status: 'error', errorMessage: 'Transaction timed out' } : s);
      });
      setIsWaitingTx(false);
      toast.error('Transaction timed out. Please try again.');
    }, isNaN(timeoutMs) ? 120000 : timeoutMs);
    return () => clearTimeout(t);
  }, [isTransactionDialogOpen, isWaitingTx]);

  const formatBalance = (balance: string | undefined, decimals = 2) => {
    if (!balance) return "0.00";
    const n = parseFloat(balance);
    if (isNaN(n)) return "0.00";
    return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const getDialogTitle = () => {
    switch (currentOperation) {
      case 'deposit': return 'Deposit Funds';
      case 'withdraw': return 'Withdraw Funds';
      case 'break': return 'Break Timelock';
      default: return 'Transaction';
    }
  };

  const allStepsCompleted = transactionSteps.every(s => s.status === 'success');
  const hasError = transactionSteps.some(s => s.status === 'error');

  const value: MiniSafeContextType = {
    usdcAddress, cusdAddress, usdtAddress,
    depositAmount, setDepositAmount,
    withdrawAmount, setWithdrawAmount,
    cusdBalance, usdcBalance, usdtBalance,
    selectedToken, setSelectedToken,
    isApproved, setIsApproved,
    isApproving, isWaitingTx, isLoading,
    isTransactionDialogOpen,
    openTransactionDialog, closeTransactionDialog,
    transactionSteps, currentOperation,
    getBalance, handleTokenChange,
    approveSpend, handleDeposit, handleWithdraw, handleBreakLock,
    formatBalance,
  };

  return (
    <MiniSafeContext.Provider value={value}>
      {children}

      <Dialog open={isTransactionDialogOpen} onOpenChange={(open) => !isWaitingTx && !open && closeTransactionDialog()}>
        <DialogContent className="sm:max-w-md border rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-black/90 dark:text-white/90">{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              {currentOperation === 'deposit' ? `Depositing ${depositAmount} ${selectedToken}` :
                currentOperation === 'withdraw' ? `Withdrawing ${selectedToken}` :
                  currentOperation === 'break' ? 'Breaking timelock to access funds early' :
                    currentOperation === 'approve' ? `Approving ${selectedToken} usage` :
                      'Transaction in progress'}
            </DialogDescription>
          </DialogHeader>

          <TransactionSteps steps={transactionSteps} />

          <DialogFooter className="flex justify-between text-black/90 dark:text-white/90">
            <Button variant="outline" onClick={closeTransactionDialog} disabled={isWaitingTx && !hasError}>
              {hasError ? 'Close' : allStepsCompleted ? 'Done' : 'Cancel'}
            </Button>
            {hasError && (
              <Button variant="destructive" onClick={() => {
                closeTransactionDialog();
                setTimeout(() => {
                  if (currentOperation === 'deposit') handleDeposit();
                  if (currentOperation === 'withdraw') handleWithdraw();
                  if (currentOperation === 'break') handleBreakLock();
                  if (currentOperation === 'approve') approveSpend();
                }, 500);
              }}>
                Try Again
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MiniSafeContext.Provider>
  );
};

export const useMiniSafe = (): MiniSafeContextType => {
  const context = useContext(MiniSafeContext);
  if (context === undefined) throw new Error('useMiniSafe must be used within a MiniSafeProvider');
  return context;
};