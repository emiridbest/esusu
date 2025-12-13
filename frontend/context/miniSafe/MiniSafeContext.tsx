"use client";
import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { contractAddress, abi } from '@/utils/abi';
import { encodeFunctionData, parseAbi, parseUnits, formatUnits, parseEther } from "viem";
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
import {
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
} from 'thirdweb/react';
import { getContract, readContract } from 'thirdweb';
import { client, activeChain } from '@/lib/thirdweb';
import useGasSponsorship from '@/hooks/useGasSponsorship';

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

// Define contract addresses
// const MINISAFE_CONTRACT_ADDRESS = '0x...';
// const TOKEN_CONTRACT_ADDRESS = '0x...';
// const REWARD_TOKEN_ADDRESS = '0x...';

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
  selectedToken: string;
  setSelectedToken: (token: string) => void;
  isApproved: boolean;
  setIsApproved: (approved: boolean) => void;
  isApproving: boolean;
  isWaitingTx: boolean;
  isLoading: boolean;

  // Transaction dialog
  isTransactionDialogOpen: boolean;
  openTransactionDialog: (operation: 'deposit' | 'withdraw' | 'break' | 'approve' | null) => void;
  closeTransactionDialog: () => void;
  transactionSteps: Step[];
  currentOperation: 'deposit' | 'withdraw' | 'break' | 'approve' | null;

  // Functions
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
  // Token addresses
  const usdcAddress = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
  const cusdAddress = "0x765de816845861e75a25fca122bb6898b8b1282a";
  const usdtAddress = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";


  // State values
  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [cusdBalance, setcusdBalance] = useState('0');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [usdtBalance, setusdtBalance] = useState('0');
  const [selectedToken, setSelectedToken] = useState('CUSD');
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isWaitingTx, setIsWaitingTx] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get thirdweb v5 wallet info
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const chain = useActiveWalletChain();
  const address = account?.address;
  const isConnected = !!account && !!wallet;

  // Get contract instances using Thirdweb v5
  const miniSafeContract = getContract({
    client,
    chain: activeChain,
    address: contractAddress,
  });

  // Default to G$ token address if env var not set
  const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A';

  const tokenContract = tokenAddress ? getContract({
    client,
    chain: activeChain,
    address: tokenAddress as `0x${string}`,
  }) : null;



  // Transaction dialog states
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState<Step[]>([]);
  const [currentOperation, setCurrentOperation] = useState<'deposit' | 'withdraw' | 'break' | 'approve' | null>(null);

  // Only get referral tag when address is available
  const dataSuffix = address ? getReferralTag({
    user: address as `0x${string}`,
    consumer: '0xb82896C4F251ed65186b416dbDb6f6192DFAF926',
  }) : '';

  const { checkAndSponsor } = useGasSponsorship();

  const getBalance = useCallback(async () => {
    if (!address || !miniSafeContract) return;

    try {
      setIsLoading(true);

      // Read CUSD balance using Thirdweb v5 readContract with ABI
      const cusdData = await readContract({
        contract: miniSafeContract,
        method: "function getBalance(address,address) view returns (uint256)",
        params: [address as `0x${string}`, cusdAddress as `0x${string}`]
      });

      // Set balance, ensuring we never have empty string
      setcusdBalance(cusdData ? cusdData.toString() : '0');

      // Read USDC balance
      const usdcData = await readContract({
        contract: miniSafeContract,
        method: "function getBalance(address,address) view returns (uint256)",
        params: [address as `0x${string}`, usdcAddress as `0x${string}`]
      });

      // Set balance, ensuring we never have empty string
      setUsdcBalance(usdcData ? usdcData.toString() : '0');

      // Read USDT balance
      const usdtData = await readContract({
        contract: miniSafeContract,
        method: "function getBalance(address,address) view returns (uint256)",
        params: [address as `0x${string}`, usdtAddress as `0x${string}`]
      });

      // Set balance, ensuring we never have empty string
      setusdtBalance(usdtData ? usdtData.toString() : '0');

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching balances:', error);
      setcusdBalance('0');
      setUsdcBalance('0');
      setusdtBalance('0');
      setIsLoading(false);
    }
  }, [address, miniSafeContract, cusdAddress, usdcAddress, usdtAddress]);



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
      if (!tokenContract) throw new Error('Token contract not available');

      const allowanceData = await readContract({
        contract: tokenContract,
        method: "function allowance(address,address) view returns (uint256)",
        params: [address as `0x${string}`, contractAddress as `0x${string}`]
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
      const dataWithSuffix = approveData + dataSuffix;

      // Send the transaction with the properly encoded data
      if (!wallet || !account) throw new Error('Wallet not connected');

      const { sendTransaction, prepareTransaction } = await import('thirdweb');
      const transaction = await prepareTransaction({
        to: tokenAddress as `0x${string}`,
        data: dataWithSuffix as `0x${string}`,
        client,
        chain: activeChain,
      });

      // Sponsor gas for approval
      try {
        const sponsorshipResult = await checkAndSponsor(address as `0x${string}`, {
          contractAddress: tokenAddress as `0x${string}`,
          abi: tokenAbi,
          functionName: 'approve',
          args: [contractAddress, depositValue],
        });

        if (sponsorshipResult.gasSponsored) {
          toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (gasError) {
        console.error("Gas sponsorship failed:", gasError);
      }

      const tx = await sendTransaction({
        account,
        transaction,
      });
      updateStepStatus('approve', 'success');
      updateStepStatus('confirm', 'loading');
      try {
        await submitReferral({
          txHash: tx.transactionHash,
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
      updateStepStatus('check-balance', 'success');
      // Approval step
      updateStepStatus('approve', 'loading');
      // Check allowance
      if (!tokenContract) throw new Error('Token contract not available');

      const { readContract } = await import('thirdweb');
      const allowanceData = await readContract({
        contract: tokenContract,
        method: "function allowance(address owner, address spender) view returns (uint256)",
        params: [address as `0x${string}`, contractAddress as `0x${string}`]
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

        if (!wallet || !account) throw new Error('Wallet not connected');

        const { sendTransaction, prepareTransaction } = await import('thirdweb');
        const approveTransaction = await prepareTransaction({
          to: tokenAddress as `0x${string}`,
          data: approveDataWithSuffix as `0x${string}`,
          client,
          chain: activeChain,
        });

        // Sponsor gas for approval
        try {
          const sponsorshipResult = await checkAndSponsor(address as `0x${string}`, {
            contractAddress: tokenAddress as `0x${string}`,
            abi: tokenAbi,
            functionName: 'approve',
            args: [contractAddress, depositValue],
          });

          if (sponsorshipResult.gasSponsored) {
            toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (gasError) {
          console.error("Gas sponsorship failed:", gasError);
        }

        const approveTx = await sendTransaction({
          account,
          transaction: approveTransaction,
        });

        if (approveTx?.transactionHash) {
          const { waitForReceipt } = await import('thirdweb');
          await waitForReceipt({
            client,
            chain: activeChain,
            transactionHash: approveTx.transactionHash,
          });
        }
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

      if (!wallet || !account) throw new Error('Wallet not connected');

      const { sendTransaction, prepareTransaction } = await import('thirdweb');
      const depositTransaction = await prepareTransaction({
        to: contractAddress as `0x${string}`,
        data: dataWithSuffix as `0x${string}`,
        client,
        chain: activeChain,
      });

      // Sponsor gas for deposit
      try {
        const sponsorshipResult = await checkAndSponsor(address as `0x${string}`, {
          contractAddress: contractAddress as `0x${string}`,
          abi: parseAbi(["function deposit(address, uint256)"]),
          functionName: 'deposit',
          args: [tokenAddress, depositValue],
        });

        if (sponsorshipResult.gasSponsored) {
          toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (gasError) {
        console.error("Gas sponsorship failed:", gasError);
      }

      const tx = await sendTransaction({
        account,
        transaction: depositTransaction,
      });
      updateStepStatus('deposit', 'success');

      // Start confirmation step
      updateStepStatus('confirm', 'loading');
      if (tx?.transactionHash) {
        const { waitForReceipt } = await import('thirdweb');
        const receipt = await waitForReceipt({
          client,
          chain: activeChain,
          transactionHash: tx.transactionHash,
        });
        if (receipt.status === "success") {
          await getBalance();
          setDepositAmount(0);
          setIsApproved(false);
          updateStepStatus('confirm', 'success');
          toast.success('Deposit successful!');
        } else {
          updateStepStatus('confirm', 'error', 'Transaction failed on blockchain');
          toast.error('Deposit failed!');
        }
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
      const withdrawalValue = parseEther(withdrawalAmount.toString());
      await getBalance();
      updateStepStatus('check-balance', 'success');

      updateStepStatus('withdraw', 'loading');

      // Fix: Create proper transaction data using viem
      const withdrawData = encodeFunctionData({
        abi,
        functionName: "withdraw",
        args: [tokenAddress as `0x${string}`, withdrawalValue],
      });
      const dataWithSuffix = withdrawData + dataSuffix;

      if (!wallet || !account) throw new Error('Wallet not connected');

      const { sendTransaction, prepareTransaction } = await import('thirdweb');
      const withdrawTransaction = await prepareTransaction({
        to: contractAddress as `0x${string}`,
        data: dataWithSuffix as `0x${string}`,
        client,
        chain: activeChain,
      });

      // Sponsor gas for withdrawal
      try {
        const sponsorshipResult = await checkAndSponsor(address as `0x${string}`, {
          contractAddress: contractAddress as `0x${string}`,
          abi: parseAbi(["function withdraw(address, uint256)"]),
          functionName: 'withdraw',
          args: [tokenAddress, withdrawalValue],
        });

        if (sponsorshipResult.gasSponsored) {
          toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (gasError) {
        console.error("Gas sponsorship failed:", gasError);
      }

      const tx = await sendTransaction({
        account,
        transaction: withdrawTransaction,
      });

      // Start confirmation step
      updateStepStatus('confirm', 'loading');
      if (tx?.transactionHash) {
        const { waitForReceipt } = await import('thirdweb');
        const receipt = await waitForReceipt({
          client,
          chain: activeChain,
          transactionHash: tx.transactionHash,
        });

        if (receipt.status === "success") {
          updateStepStatus('confirm', 'success');
          await getBalance();
          toast.success('Withdrawal successful!');
        } else {
          updateStepStatus('confirm', 'error', 'Transaction failed on blockchain');
          toast.error('Withdrawal failed!');
        }
      }
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
        if (!wallet || !account) throw new Error('Wallet not connected');

        const { sendTransaction, prepareTransaction } = await import('thirdweb');
        const breakTransaction = await prepareTransaction({
          to: contractAddress as `0x${string}`,
          data: breakData as `0x${string}`,
          client,
          chain: activeChain,
        });

        // Sponsor gas for break timelock
        try {
          const sponsorshipResult = await checkAndSponsor(address as `0x${string}`, {
            contractAddress: contractAddress as `0x${string}`,
            abi: parseAbi(["function breakTimelock(address)"]),
            functionName: 'breakTimelock',
            args: [tokenAddress],
          });

          if (sponsorshipResult.gasSponsored) {
            toast.success(`Gas sponsored: ${sponsorshipResult.amountSponsored} CELO`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (gasError) {
          console.error("Gas sponsorship failed:", gasError);
        }

        breakTx = await sendTransaction({
          account,
          transaction: breakTransaction,
        });
      } catch (txError) {
        console.error('Break transaction failed:', txError);
        updateStepStatus('break', 'error');
        throw txError;
      }

      // Update break step to success and start confirmation step
      toast.info('Waiting for confirmation...');
      if (breakTx?.transactionHash) {
        const { waitForReceipt } = await import('thirdweb');
        const receipt = await waitForReceipt({
          client,
          chain: activeChain,
          transactionHash: breakTx.transactionHash,
        });
        if (receipt.status === "success") {
          toast.success('Timelock broken successfully!');
          updateStepStatus('break', 'success');
          updateStepStatus('confirm', 'loading');
          // Optional referral submit
          try {
            await submitReferral({
              txHash: breakTx.transactionHash,
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
    }
  }, [address, getBalance]);

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
    selectedToken,
    setSelectedToken,
    isApproved,
    setIsApproved,
    isApproving,
    isWaitingTx,
    isLoading,

    // Transaction dialog
    isTransactionDialogOpen,
    openTransactionDialog,
    closeTransactionDialog,
    transactionSteps,
    currentOperation,

    // Functions
    getBalance,
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