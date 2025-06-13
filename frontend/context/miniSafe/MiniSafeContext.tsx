import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { contractAddress, abi } from '@/utils/abi';
import { formatUnits, Interface } from "ethers";
import { gweiUnits, parseEther, parseUnits } from "viem";
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk';
import { Celo } from '@celo/rainbowkit-celo/chains';
import {
  useAccount,
  usePublicClient,
  useSendTransaction,
} from 'wagmi';
import { readContract, writeContract } from '@wagmi/core';

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

// Divvi Integration 
const dataSuffix = getDataSuffix({
  consumer: '0xb82896C4F251ed65186b416dbDb6f6192DFAF926',
  providers: ['0x0423189886d7966f0dd7e7d256898daeee625dca','0xc95876688026be9d6fa7a7c33328bd013effa2bb','0x7beb0e14f8d2e6f6678cc30d867787b384b19e20'],
})

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
  } = useSendTransaction({ chainId: Celo.id });


  // Transaction dialog states
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState<Step[]>([]);
  const [currentOperation, setCurrentOperation] = useState<'deposit' | 'withdraw' | 'break' | 'approve' | null>(null);

  // Get wagmi account info
  const { address } = useAccount();
  const publicClient = usePublicClient();

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

    try {
      const data = await readContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'balanceOf',
        args: [address],
      });

      if (data) {
        const formattedBalance = formatUnits(data as unknown as bigint, 0);
        setTokenBalance(formattedBalance.toString());
      } else {
        // Ensure we never set an empty string
        setTokenBalance('0');
      }
    } catch (error) {
      console.error("Error fetching token balance:", error);
      // Set a default value on error
      setTokenBalance('0');
    }
  }, [address]);

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
    updateStepStatus('check-balance', 'loading');
    await getBalance();

    try {
      const tokenAddress = getTokenAddress(selectedToken);
      const depositValue = parseEther(depositAmount.toString());

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

      const tokenAbi = [
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ];
      // Correctly encode the approve function with parameters
      const approveInterface = new Interface(tokenAbi);
      const approveData = approveInterface.encodeFunctionData("approve", [
        contractAddress,
        depositValue,
      ]);

      // Append the data suffix to the approve call data
      const dataWithSuffix = approveData + dataSuffix;

      // Send the transaction with the properly encoded data
      const tx = await sendTransactionAsync({
        to: tokenAddress,
        data: dataWithSuffix as `0x${string}`,
        chainId: Celo.id,
      });
      updateStepStatus('approve', 'success');
      updateStepStatus('confirm', 'loading');
      try {
        await submitReferral({
          txHash: tx.hash as `0x${string}`,
          chainId: Celo.id
        });


        setIsApproved(true);
        toast.success('Approval successful!');
        updateStepStatus('confirm', 'success');
      } catch (referralError) {
        console.error("Error submitting referral:", referralError);
        setIsApproved(true);
        toast.success('Approval successful, but referral tracking failed');
      }
    } catch (error) {
      console.error("Error approving spend:", error);
      toast.error('Approval failed!');
    } finally {
      setIsApproving(false);
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
      const depositValue = parseEther(depositAmount.toString());

      // Check balance and update first step
      await getBalance();
      await getTokenBalance();
      updateStepStatus('check-balance', 'success');

      // Start second step - allowance
      updateStepStatus('allowance', 'loading');

      // Check if already approved
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

      // If not approved, approve

      if ((allowanceData as bigint) < (depositValue as bigint)) {
        // Start approval step
        updateStepStatus('approve', 'loading');
        const tokenAbi = [
          "function approve(address spender, uint256 amount) returns (bool)"
        ];
        const approveInterface = new Interface(tokenAbi);
        const approveData = approveInterface.encodeFunctionData("approve", [
          contractAddress,
          depositValue,
        ]);

        const dataWithSuffix = approveData + dataSuffix;
        await sendTransactionAsync({
          to: tokenAddress as `0x${string}`,
          data: dataWithSuffix as `0x${string}`,
          chainId: Celo.id,
        });
      }

      // Update second step
      updateStepStatus('approve', 'success');
      
      // Start third step - deposit
      updateStepStatus('deposit', 'loading');
      
      const { hash } = await writeContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'deposit',
        args: [tokenAddress, depositValue],
      });

      updateStepStatus('deposit', 'success');
      
      // Start confirmation step
      updateStepStatus('confirm', 'loading');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

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

    // Open the multi-step dialog
    openTransactionDialog('withdraw');
    setIsWaitingTx(true);
    
    try {
      // Update first step to loading state
      updateStepStatus('check-balance', 'loading');
      
      const tokenAddress = getTokenAddress(selectedToken);

      // Get token decimals (you might need to fetch this from the token contract)
      const getTokenDecimals = (selectedToken: string) => {
        switch (selectedToken) {
          case 'USDC': return 6;  // USDC typically uses 6 decimals
          case 'USDT': return 6;  // USDT typically uses 6 decimals  
          case 'CUSD': return 18; // Assuming CUSD uses 18 decimals
          default: return 18;
        }
      };

      const decimals = getTokenDecimals(selectedToken);

      let withdrawalAmount: string = "0";
      if (selectedToken === 'CUSD') {
        withdrawalAmount = cusdBalance;
      } else if (selectedToken === 'USDC') {
        withdrawalAmount = usdcBalance;
      } else if (selectedToken === 'USDT') {
        withdrawalAmount = usdtBalance;
      }

      // Check balance and update first step
      await getBalance();
      await getTokenBalance();
      updateStepStatus('check-balance', 'success');
      
      // Start second step - withdrawal
      updateStepStatus('withdraw', 'loading');
      
      const weiAmount = parseEther(withdrawalAmount); //to be fixed
      const { hash } = await writeContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'withdraw',
        args: [tokenAddress, weiAmount],
      });

      // Update second step
      updateStepStatus('withdraw', 'success');
      
      // Start confirmation step
      updateStepStatus('confirm', 'loading');
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
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
    } catch (error) {
      console.error("Error making withdrawal:", error);
      toast.error('Withdrawal failed!');
      
      // Find the current loading step and mark it as error
      const loadingStepIndex = transactionSteps.findIndex(step => step.status === 'loading');
      if (loadingStepIndex !== -1) {
        updateStepStatus(
          transactionSteps[loadingStepIndex].id, 
          'error', 
          error instanceof Error ? error.message : 'Unknown error'
        );
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

      // Get token balance
      await getBalance();
      await getTokenBalance();
      
      // Update first step to success and start second step
      updateStepStatus('check-balance', 'success');
      updateStepStatus('approve', 'loading');

      // approve token spend if not already approved
      const tokenAbi = [
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ];
      const spend = await readContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'MIN_TOKENS_FOR_TIMELOCK_BREAK',
      }) as number;
      const spendAmount = parseEther(spend.toString());
      
      // Correctly encode the approve function with parameters
      const approveInterface = new Interface(tokenAbi);
      const approveData = approveInterface.encodeFunctionData("approve", [
        contractAddress,
        spendAmount,
      ]);

      // Append the data suffix to the approve call data
      const dataWithSuffix = approveData + dataSuffix;

      // Send the transaction with the properly encoded data
      const tx = await sendTransactionAsync({
        to: contractAddress as `0x${string}`,
        data: dataWithSuffix as `0x${string}`,
        chainId: Celo.id,
      });

      // Update second step to success and start third step
      updateStepStatus('approve', 'success');
      updateStepStatus('break', 'loading');
      
      const breakTimelockInterface = new Interface(abi);
      const breakTimelockData = breakTimelockInterface.encodeFunctionData("breakTimelock", [
        tokenAddress
      ]);
      const breakData = breakTimelockData + dataSuffix;
      
      let txHash: `0x${string}`;
      try {
        const sendHash = await sendTransactionAsync({
          to: contractAddress as `0x${string}`,
          data: breakData as `0x${string}`,
          chainId: Celo.id,
        });
        txHash = sendHash.hash;
      } catch (error) {
        updateStepStatus('confirm', 'error', error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }

      // Update third step to success and start confirmation step
      toast.info('Waiting for confirmation...');

      await getBalance();
      await getTokenBalance();
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      updateStepStatus('break', 'success');
      updateStepStatus('confirm', 'loading');
      if (receipt.status === 'success') {
        toast.success('Timelock broken successfully!');
      } else {
        updateStepStatus('confirm', 'error', 'Transaction failed on blockchain');
        toast.error('Transaction failed');
      }
      
      await getBalance();
      await getTokenBalance();
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
          description: 'Checking your token balance...',
          status: 'inactive' 
        },
        { 
          id: 'approve',
          title: 'Approve',
          description: 'Approving token spend for timelock break...',
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