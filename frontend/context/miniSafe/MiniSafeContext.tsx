import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { contractAddress, abi } from '@/utils/abi';
import { encodeFunctionData, parseAbi, parseUnits, formatUnits } from "viem";
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
import {
  useAccount,
  usePublicClient,
  useSendTransaction,
} from 'wagmi';
import { readContract } from '@wagmi/core';

// Import Dialog components
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
  // Token addresses
  usdcAddress: string;
  cusdAddress: string;
  usdtAddress: string;

  // State values
  depositAmount: number;
  setDepositAmount: (amount: number) => void;
  withdrawAmount: number;
  setWithdrawAmount: (amount: number) => void;
  cusdBalance: string;
  usdcBalance: string;
  usdtBalance: string;
  tokenBalance: string;
  selectedToken: string;
  setSelectedToken: (token: string) => void;
  isApproved: boolean;
  setIsApproved: (approved: boolean) => void;
  isApproving: boolean;
  isWaitingTx: boolean;
  isLoading: boolean;
  interestRate: number;

  // Transaction dialog
  isTransactionDialogOpen: boolean;
  openTransactionDialog: (operation: 'deposit' | 'withdraw' | 'break' | 'approve' | null) => void;
  closeTransactionDialog: () => void;
  transactionSteps: Step[];
  currentOperation: 'deposit' | 'withdraw' | 'break' | 'approve' | null;

  // Functions
  getBalance: () => Promise<void>;
  getTokenBalance: () => Promise<void>;
  handleTokenChange: (value: string) => void;
  approveSpend: () => Promise<void>;
  handleDeposit: () => Promise<void>;
  handleWithdraw: () => Promise<void>;
  handleBreakLock: () => Promise<void>;
  formatBalance: (balance: string, decimals?: number) => string;
}

const MiniSafeContext = createContext<MiniSafeContextType | undefined>(undefined);

export const MiniSafeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Token addresses
  const usdcAddress = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
  const cusdAddress = "0x765de816845861e75a25fca122bb6898b8b1282a";
  const usdtAddress = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
  // Reward token (EST) configuration via environment
  const rewardTokenAddressEnv = (process.env.NEXT_PUBLIC_REWARD_TOKEN_ADDRESS || '').trim();
  const rewardTokenDecimalsDefault = Number.parseInt(process.env.NEXT_PUBLIC_REWARD_TOKEN_DECIMALS || '18', 10);

  // State values
  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [cusdBalance, setcusdBalance] = useState('0');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [usdtBalance, setusdtBalance] = useState('0');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [selectedToken, setSelectedToken] = useState('CUSD');
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isWaitingTx, setIsWaitingTx] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [interestRate] = useState(5); // 5% APY for visualization
  const {
    sendTransactionAsync
  } = useSendTransaction();


  // Transaction dialog states
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState<Step[]>([]);
  const [currentOperation, setCurrentOperation] = useState<'deposit' | 'withdraw' | 'break' | 'approve' | null>(null);

  // Get wagmi account info
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // Only get referral tag when address is available
  const dataSuffix = address ? getReferralTag({
    user: address as `0x${string}`,
    consumer: '0xb82896C4F251ed65186b416dbDb6f6192DFAF926',
  }) : '';
  const getBalance = useCallback(async () => {
    if (!address) return;

    try {
      setIsLoading(true);

      // Read CUSD balance
      const cusdData = await readContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'getBalance',
        args: [address, cusdAddress],
      });

      // Set balance, ensuring we never have empty string
      setcusdBalance(cusdData ? cusdData.toString() : '0');

      // Read USDC balance
      const usdcData = await readContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'getBalance',
        args: [address, usdcAddress],
      });

      // Set balance, ensuring we never have empty string
      setUsdcBalance(usdcData ? usdcData.toString() : '0');

      // Read USDT balance
      const usdtData = await readContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'getBalance',
        args: [address, usdtAddress],
      });

      // Set balance, ensuring we never have empty string
      setusdtBalance(usdtData ? usdtData.toString() : '0');
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const getTokenBalance = useCallback(async () => {
    if (!address) return;

    const tokenAddress = rewardTokenAddressEnv as `0x${string}` | '';
    if (!tokenAddress || !tokenAddress.startsWith('0x')) {
      console.warn('Reward token address is not set. Set NEXT_PUBLIC_REWARD_TOKEN_ADDRESS to enable EST balance.');
      setTokenBalance('0');
      return;
    }

    // Minimal ERC20 ABI for balance and decimals (typed via parseAbi)
    const erc20Abi = parseAbi([
      'function balanceOf(address account) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ]);

    try {
      // Try to read token decimals; fallback to env default
      let decimals = rewardTokenDecimalsDefault;
      try {
        const d = await readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'decimals',
        });
        if (typeof d === 'number') decimals = d;
        if (typeof d === 'bigint') decimals = Number(d);
      } catch {
        // ignore, keep default
      }

      const data = await readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      });

      if (typeof data === 'bigint') {
        const formatted = formatUnits(data, decimals);
        setTokenBalance(formatted);
      } else {
        setTokenBalance('0');
      }
    } catch (error) {
      console.error('Error fetching reward token balance:', error);
      setTokenBalance('0');
    }
  }, [address, rewardTokenAddressEnv, rewardTokenDecimalsDefault]);

  const handleTokenChange = (value: string) => {
    setSelectedToken(value);
  };

  // Update step status helper function
  const updateStepStatus = (stepId: string, status: StepStatus, errorMessage?: string) => {
    setTransactionSteps(prevSteps => prevSteps.map(step =>
      step.id === stepId
        ? { ...step, status, ...(errorMessage ? { errorMessage } : {}) }
        : step
    ));
  };

  const getTokenAddress = (token: string) => {
    switch (token) {
      case 'USDC':
        return usdcAddress;
      case 'CUSD':
        return cusdAddress;
      case 'USDT':
        return usdtAddress;
      default:
        return usdcAddress;
    }
  };

  const getTokenDecimals = (token: string) => {
    switch (token) {
      case 'USDC':
      case 'USDT':
        return 6;
      case 'CUSD':
      default:
        return 18;
    }
  };

  // Configure approve transaction
  const approveSpend = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    openTransactionDialog('approve');
    setIsApproving(true);
    setIsWaitingTx(true);
    updateStepStatus('check-balance', 'loading');
    await getBalance();

    try {
      const tokenAddress = getTokenAddress(selectedToken);
      const decimals = getTokenDecimals(selectedToken);
      const depositValue = parseUnits(depositAmount.toString(), decimals);

      updateStepStatus('allowance', 'loading');
      // Check allowance first
      const allowanceData = await readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'allowance',
            type: 'function',
            stateMutability: 'view',
            inputs: [
              { name: 'owner', type: 'address' },
              { name: 'spender', type: 'address' }
            ],
            outputs: [{ name: '', type: 'uint256' }]
          }
        ],
        functionName: 'allowance',
        args: [address, contractAddress],
      });
      updateStepStatus('allowance', 'success');
      // Compare BigInt values directly
      if ((allowanceData as bigint) >= (depositValue as bigint)) {
        setIsApproved(true);
        toast.success('Already approved!');
        setIsApproving(false);
        updateStepStatus('approve', 'success');
        closeTransactionDialog();
        return;
      }
      updateStepStatus('approve', 'loading');
      toast.info('Approving transaction...');

      const tokenAbi = parseAbi([
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ]);
      // Correctly encode the approve function with parameters using viem
      const approveData = encodeFunctionData({
        abi: tokenAbi,
        functionName: "approve",
        args: [contractAddress as `0x${string}`, depositValue],
      });
      const dataSuffix = address ? getReferralTag({
        user: address,
        consumer: '0xb82896C4F251ed65186b416dbDb6f6192DFAF926',
      }) : '';
      // Append the data suffix to the approve call data
      const dataWithSuffix = approveData + dataSuffix;

      // Send the transaction with the properly encoded data
      const tx = await sendTransactionAsync({
        to: tokenAddress,
        data: dataWithSuffix as `0x${string}`,
        chainId: 42220,
      });
      updateStepStatus('approve', 'success');
      updateStepStatus('confirm', 'loading');
      try {
        await submitReferral({
          txHash: tx.hash,
          chainId: 42220
        });


        setIsApproved(true);
        toast.success('Approval successful!');
        updateStepStatus('confirm', 'success');
      } catch (referralError) {
        console.error("Error submitting referral:", referralError);
        setIsApproved(true);
        toast.success('Approval successful, but referral tracking failed');
        // Even if referral fails, finalize the confirm step so UI doesn't hang
        updateStepStatus('confirm', 'success');
      }
    } catch (error) {
      console.error("Error approving spend:", error);
      toast.error('Approval failed!');
      // Mark the current loading step as error to avoid stuck 'loading' UI
      const loadingStepIndex = transactionSteps.findIndex(step => step.status === 'loading');
      if (loadingStepIndex !== -1) {
        updateStepStatus(
          transactionSteps[loadingStepIndex].id,
          'error',
          error instanceof Error ? error.message : 'Unknown error'
        );
      } else {
        // Fallback: mark approve step as error
        updateStepStatus('approve', 'error', error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      setIsApproving(false);
      setIsWaitingTx(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || !selectedToken) {
      toast.error('Please enter an amount and select a token');
      return;
    }

    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    // Open the multi-step dialog
    openTransactionDialog('deposit');
    setIsWaitingTx(true);

    try {
      // Update first step to loading state
      updateStepStatus('check-balance', 'loading');

      const tokenAddress = getTokenAddress(selectedToken);
      const decimals = getTokenDecimals(selectedToken);
      const depositValue = parseUnits(depositAmount.toString(), decimals);

      // Check balance and update first step
      await getBalance();
      await getTokenBalance();
      updateStepStatus('check-balance', 'success');
      // Approval step
      updateStepStatus('approve', 'loading');
      // Check allowance
      const allowanceData = await readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'allowance',
            type: 'function',
            stateMutability: 'view',
            inputs: [
              { name: 'owner', type: 'address' },
              { name: 'spender', type: 'address' }
            ],
            outputs: [{ name: '', type: 'uint256' }]
          }
        ],
        functionName: 'allowance',
        args: [address, contractAddress],
      });
      if ((allowanceData as bigint) >= (depositValue as bigint)) {
        updateStepStatus('approve', 'success');
      } else {
        const tokenAbi = parseAbi([
          "function approve(address spender, uint256 amount) returns (bool)"
        ]);
        const approveData = encodeFunctionData({
          abi: tokenAbi,
          functionName: "approve",
          args: [contractAddress as `0x${string}`, depositValue],
        });
        const approveDataWithSuffix = approveData + dataSuffix;
        const approveTx = await sendTransactionAsync({
          to: tokenAddress as `0x${string}`,
          data: approveDataWithSuffix as `0x${string}`,
          chainId: 42220,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx.hash });
        updateStepStatus('approve', 'success');
      }

      // Start third step - deposit
      updateStepStatus('deposit', 'loading');

      // Create proper transaction data using viem
      const depositData = encodeFunctionData({
        abi,
        functionName: "deposit",
        args: [tokenAddress as `0x${string}`, depositValue],
      });
      const dataWithSuffix = depositData + dataSuffix;

      const tx = await sendTransactionAsync({
        to: contractAddress as `0x${string}`,
        data: dataWithSuffix as `0x${string}`,
        chainId: 42220,
      });
      updateStepStatus('deposit', 'success');

      // Start confirmation step
      updateStepStatus('confirm', 'loading');
      await submitReferral({
        txHash: tx.hash,
        chainId: 42220
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx.hash });
      if (receipt.status === 'success') {
        await getBalance();
        await getTokenBalance();
        setDepositAmount(0);
        setIsApproved(false);
        updateStepStatus('confirm', 'success');
        toast.success('Deposit successful!');
      } else {
        updateStepStatus('confirm', 'error', 'Transaction failed on blockchain');
        toast.error('Deposit failed!');
      }

    } catch (error) {
      console.error("Error making deposit:", error);
      toast.error('Deposit failed!');

      // Find the current loading step and mark it as error
      const loadingStepIndex = transactionSteps.findIndex(step => step.status === 'loading');
      if (loadingStepIndex !== -1) {
        updateStepStatus(
          transactionSteps[loadingStepIndex].id,
          'error',
          error instanceof Error ? error.message : 'Unknown error'
        );
      } else {
        // Fallback: mark confirm step as error so UI can close gracefully
        updateStepStatus('confirm', 'error', error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {

      setIsWaitingTx(false);
    }
  };


  const handleWithdraw = async () => {
    if (!selectedToken) {
      toast.error('Please select a token');
      return;
    }
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    openTransactionDialog('withdraw');
    setIsWaitingTx(true);

    try {
      updateStepStatus('check-balance', 'loading');

      const tokenAddress = getTokenAddress(selectedToken);

      let withdrawalAmount: string = "0";
      if (selectedToken === 'CUSD') {
        withdrawalAmount = cusdBalance;
      } else if (selectedToken === 'USDC') {
        withdrawalAmount = usdcBalance;
      } else if (selectedToken === 'USDT') {
        withdrawalAmount = usdtBalance;
      }

      // Fix: Properly define weiAmount
      const withdrawalValue = BigInt(withdrawalAmount);

      await getBalance();
      await getTokenBalance();
      updateStepStatus('check-balance', 'success');

      updateStepStatus('withdraw', 'loading');

      // Fix: Create proper transaction data using viem
      const withdrawData = encodeFunctionData({
        abi,
        functionName: "withdraw",
        args: [tokenAddress as `0x${string}`, withdrawalValue],
      });
      const dataWithSuffix = withdrawData + dataSuffix;

      const tx = await sendTransactionAsync({
        to: contractAddress as `0x${string}`,
        data: dataWithSuffix as `0x${string}`,
        chainId: 42220,
      });
      updateStepStatus('withdraw', 'success');
      updateStepStatus('confirm', 'loading');

      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx.hash });

      if (receipt.status === 'success') {
        updateStepStatus('confirm', 'success');
        toast.success('Withdrawal successful!');
      } else {
        updateStepStatus('confirm', 'error', 'Transaction failed on blockchain');
        toast.error('Withdrawal failed!');
      }

      await getBalance();
      await getTokenBalance();
      setWithdrawAmount(0);
      await submitReferral({
        txHash: tx.hash,
        chainId: 42220
      });

    } catch (error) {
      console.error("Error making withdrawal:", error);
      toast.error('Withdrawal failed!');

      const loadingStepIndex = transactionSteps.findIndex(step => step.status === 'loading');
      if (loadingStepIndex !== -1) {
        updateStepStatus(
          transactionSteps[loadingStepIndex].id,
          'error',
          error instanceof Error ? error.message : 'Unknown error'
        );
      } else {
        // Fallback: ensure an error is reflected to avoid stuck UI
        updateStepStatus('confirm', 'error', error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      setIsWaitingTx(false);
    }
  };

  const handleBreakLock = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    // Open the multi-step dialog
    openTransactionDialog('break');
    setIsWaitingTx(true);

    try {
      // Update first step to loading state
      updateStepStatus('check-balance', 'loading');
      const tokenAddress = getTokenAddress(selectedToken);

      // Refresh balances/info
      await getBalance();
      // No EST token logic required anymore

      // Update first step to success and start break step
      updateStepStatus('check-balance', 'success');
      updateStepStatus('break', 'loading');

      const breakTimelockData = encodeFunctionData({
        abi,
        functionName: "breakTimelock",
        args: [tokenAddress as `0x${string}`],
      });
      const breakData = breakTimelockData + dataSuffix;

      let breakTx: any;
      try {
        breakTx = await sendTransactionAsync({
          to: contractAddress as `0x${string}`,
          data: breakData as `0x${string}`,
          chainId: 42220,
        });

      } catch (error) {
        updateStepStatus('break', 'error', error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }

      // Update break step to success and start confirmation step
      toast.info('Waiting for confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: breakTx.hash });
      if (receipt.status === 'success') {
        toast.success('Timelock broken successfully!');
        updateStepStatus('break', 'success');
        updateStepStatus('confirm', 'loading');
        // Optional referral submit
        try {
          await submitReferral({
            txHash: breakTx.hash,
            chainId: 42220
          });
        } catch (referralError) {
          console.error('Error submitting referral:', referralError);
        }
        updateStepStatus('confirm', 'success');
        await getBalance();
      } else {
        updateStepStatus('break', 'error', 'Transaction failed on blockchain');
        toast.error('Transaction failed');
      }
    } catch (error) {
      console.error("Error breaking timelock:", error);
      toast.error('Error breaking timelock');

      // Find the current loading step and mark it as error
      const loadingStepIndex = transactionSteps.findIndex(step => step.status === 'loading');
      if (loadingStepIndex !== -1) {
        updateStepStatus(
          transactionSteps[loadingStepIndex].id,
          'error',
          error instanceof Error ? error.message : 'Unknown error'
        );
      } else {
        // Fallback: ensure an error is reflected to avoid stuck UI
        updateStepStatus('confirm', 'error', error instanceof Error ? error.message : 'Unknown error');
      }
    } finally {
      setIsWaitingTx(false);
    }
  };

  // Transaction dialog handlers
  const openTransactionDialog = (operation: 'deposit' | 'withdraw' | 'break' | 'approve' | null) => {
    setCurrentOperation(operation);
    setIsTransactionDialogOpen(true);

    // Set up transaction steps based on the operation
    let steps: Step[] = [];
    if (operation === 'deposit') {
      steps = [
        {
          id: 'check-balance',
          title: 'Check Balance',
          description: 'Checking your wallet balance...',
          status: 'inactive'
        },
        {
          id: 'approve',
          title: 'Approve',
          description: `Allowing safe to use your ${selectedToken}...`,
          status: 'inactive'
        },
        {
          id: 'deposit',
          title: 'Deposit',
          description: `Depositing ${depositAmount} ${selectedToken} into the safe...`,
          status: 'inactive'
        },
        {
          id: 'confirm',
          title: 'Confirm',
          description: 'Confirming transaction on the blockchain...',
          status: 'inactive'
        }
      ];
    } else if (operation === 'withdraw') {
      steps = [
        {
          id: 'check-balance',
          title: 'Check Balance',
          description: 'Checking your safe balance...',
          status: 'inactive'
        },
        {
          id: 'withdraw',
          title: 'Withdraw',
          description: `Withdrawing your ${selectedToken} from the safe...`,
          status: 'inactive'
        },
        {
          id: 'confirm',
          title: 'Confirm',
          description: 'Confirming transaction on the blockchain...',
          status: 'inactive'
        }
      ];
    } else if (operation === 'break') {
      steps = [
        {
          id: 'check-balance',
          title: 'Check Balance',
          description: 'Checking your safe balance...',
          status: 'inactive'
        },
        {
          id: 'break',
          title: 'Break Timelock',
          description: 'Requesting to break timelock...',
          status: 'inactive'
        },
        {
          id: 'confirm',
          title: 'Confirm',
          description: 'Confirming transaction on the blockchain...',
          status: 'inactive'
        }
      ];
    }
    else if (operation === 'approve') {
      steps = [
        {
          id: 'check-balance',
          title: 'Check Balance',
          description: 'Checking your token balance...',
          status: 'inactive'
        },
        {
          id: 'allowance',
          title: 'Allowance',
          description: `Checking allowance for ${selectedToken}...`,
          status: 'inactive'
        },
        {
          id: 'approve',
          title: 'Approve',
          description: `Allowing safe to use your ${selectedToken}...`,
          status: 'inactive'
        },
        {
          id: 'confirm',
          title: 'Confirm',
          description: 'Confirming transaction on the blockchain...',
          status: 'inactive'
        }
      ];
    }
    setTransactionSteps(steps);
  };

  const closeTransactionDialog = () => {
    setIsTransactionDialogOpen(false);
    setCurrentOperation(null);
    // Reset steps after dialog closes with a delay
    setTimeout(() => {
      setTransactionSteps([]);
    }, 300);
  };

  useEffect(() => {
    if (address) {
      getBalance();
      getTokenBalance();
    }
  }, [address, getBalance, getTokenBalance]);

  // Format balance for display
  const formatBalance = (balance: string | undefined, decimals = 2) => {
    if (!balance) return "0.00";

    const balanceNumber = parseFloat(balance);
    if (isNaN(balanceNumber)) {
      return "0.00";
    }
    return balanceNumber.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const value = {
    // Token addresses
    usdcAddress,
    cusdAddress,
    usdtAddress,

    // State values
    depositAmount,
    setDepositAmount,
    withdrawAmount,
    setWithdrawAmount,
    cusdBalance,
    usdcBalance,
    usdtBalance,
    tokenBalance,
    selectedToken,
    setSelectedToken,
    isApproved,
    setIsApproved,
    isApproving,
    isWaitingTx,
    isLoading,
    interestRate,

    // Transaction dialog
    isTransactionDialogOpen,
    openTransactionDialog,
    closeTransactionDialog,
    transactionSteps,
    currentOperation,

    // Functions
    getBalance,
    getTokenBalance,
    handleTokenChange,
    approveSpend,
    handleDeposit,
    handleWithdraw,
    handleBreakLock,
    formatBalance,
  };

  // Get dialog title based on current operation
  const getDialogTitle = () => {
    switch (currentOperation) {
      case 'deposit':
        return 'Deposit Funds';
      case 'withdraw':
        return 'Withdraw Funds';
      case 'break':
        return 'Break Timelock';
      default:
        return 'Transaction';
    }
  };

  // Check if all steps are completed
  const allStepsCompleted = transactionSteps.every(step => step.status === 'success');
  const hasError = transactionSteps.some(step => step.status === 'error');

  // Auto-close the transaction dialog once steps complete (success) or any error occurs
  // and we're no longer waiting on a transaction. A small delay lets the UI show final state.
  useEffect(() => {
    if (!isTransactionDialogOpen) return;
    const allDone = transactionSteps.length > 0 && transactionSteps.every(step => step.status === 'success');
    const anyError = transactionSteps.some(step => step.status === 'error');
    if (!isWaitingTx && (allDone || anyError)) {
      const t = setTimeout(() => {
        closeTransactionDialog();
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [isTransactionDialogOpen, isWaitingTx, transactionSteps]);

  // Safety: timeout any transaction that takes too long to avoid indefinite 'loading'.
  useEffect(() => {
    if (!isTransactionDialogOpen || isWaitingTx === false) return;
    const timeoutMs = Number.parseInt(process.env.NEXT_PUBLIC_TX_TIMEOUT_MS || '120000', 10);
    const t = setTimeout(() => {
      // Mark any loading step as error and stop waiting
      setTransactionSteps(prev => {
        const loading = [...prev].reverse().find(s => s.status === 'loading');
        if (!loading) return prev.map(s => s);
        return prev.map(s => s.id === loading.id ? { ...s, status: 'error', errorMessage: 'Transaction timed out' } : s);
      });
      setIsWaitingTx(false);
      toast.error('Transaction timed out. Please try again.');
    }, isNaN(timeoutMs) ? 120000 : timeoutMs);
    return () => clearTimeout(t);
  }, [isTransactionDialogOpen, isWaitingTx]);

  return (
    <MiniSafeContext.Provider value={value}>
      {children}

      {/* Multi-step Transaction Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={(open) => !isWaitingTx && !open && closeTransactionDialog()}>
        <DialogContent className="sm:max-w-md border rounded-lg">
          <DialogHeader>
            <DialogTitle className='text-black/90 dark:text-white/90'>{getDialogTitle()}</DialogTitle>
            <DialogDescription>
              {currentOperation === 'deposit' ?
                `Depositing ${depositAmount} ${selectedToken}` :
                currentOperation === 'withdraw' ?
                  `Withdrawing ${selectedToken}` :
                  'Breaking timelock to access funds early'}
            </DialogDescription>
          </DialogHeader>

          {/* Transaction Steps */}
          <TransactionSteps steps={transactionSteps} />

          <DialogFooter className="flex justify-between text-black/90 dark:text-white/90">
            <Button
              variant="outline"
              onClick={closeTransactionDialog}
              disabled={isWaitingTx && !hasError}
            >
              {hasError ? 'Close' : allStepsCompleted ? 'Done' : 'Cancel'}
            </Button>

            {hasError && (
              <Button
                variant="destructive"
                onClick={() => {
                  closeTransactionDialog();
                  // Re-attempt the operation after closing
                  setTimeout(() => {
                    if (currentOperation === 'deposit') handleDeposit();
                    if (currentOperation === 'withdraw') handleWithdraw();
                    if (currentOperation === 'break') handleBreakLock();
                    if (currentOperation === 'approve') approveSpend();
                  }, 500);
                }}
              >
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
  if (context === undefined) {
    throw new Error('useMiniSafe must be used within a MiniSafeProvider');
  }
  return context;
};