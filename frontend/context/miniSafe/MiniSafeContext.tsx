import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { contractAddress, abi } from '@/utils/abi';
import { formatUnits, Interface } from "ethers";
import { gweiUnits, parseEther, parseUnits } from "viem";
import { BigNumber } from 'alchemy-sdk';
import { getDataSuffix, submitReferral } from '@divvi/referral-sdk';
import { Celo } from '@celo/rainbowkit-celo/chains';
import {
  useAccount,
  useBalance,
  useContractRead,
  useContractWrite,
  useWaitForTransaction,
  usePublicClient,
  usePrepareSendTransaction,
  useSendTransaction,
  useToken
} from 'wagmi';
import { readContract, writeContract, getAccount, prepareWriteContract } from '@wagmi/core';

// Divvi Integration
const dataSuffix = getDataSuffix({
  consumer: '0xb82896C4F251ed65186b416dbDb6f6192DFAF926',
  providers: ['0x5f0a55FaD9424ac99429f635dfb9bF20c3360Ab8', '0x6226ddE08402642964f9A6de844ea3116F0dFc7e'],
});

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

    setIsApproving(true);

    try {
      const tokenAddress = getTokenAddress(selectedToken);
      const depositValue = parseEther(depositAmount.toString());

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

      // Compare BigInt values directly
      if ((allowanceData as bigint) >= (depositValue as bigint)) {
        setIsApproved(true);
        toast.success('Already approved!');
        setIsApproving(false);
        return;
      }

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

      try {
        await submitReferral({
          txHash: tx.hash as `0x${string}`,
          chainId: Celo.id
        });


        setIsApproved(true);
        toast.success('Approval successful!');
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

    setIsWaitingTx(true);

    try {
      const tokenAddress = getTokenAddress(selectedToken);
      const depositValue = parseEther(depositAmount.toString());

      toast.info('Processing deposit...');

      const { hash } = await writeContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'deposit',
        args: [tokenAddress, depositValue],
      });

      toast.info('Waiting for confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        await getBalance();
        await getTokenBalance();
        setDepositAmount(0);
        setIsApproved(false);
        toast.success('Deposit successful!');
      } else {
        toast.error('Deposit failed!');
      }
    } catch (error) {
      console.error("Error making deposit:", error);
      toast.error('Deposit failed!');
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
  
  setIsWaitingTx(true);
  try {
    const tokenAddress = getTokenAddress(selectedToken);
    
    // Get token decimals (you might need to fetch this from the token contract)
    const getTokenDecimals = (selectedToken: string) => {
      switch(selectedToken) {
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
const gweiAmount = BigInt(withdrawalAmount) / BigInt('10000000'); //to be fixed
    toast.info('Processing withdrawal...');
    const { hash } = await writeContract({
      address: contractAddress as `0x${string}`,
      abi,
      functionName: 'withdraw',
      args: [tokenAddress, gweiAmount], // Use BigInt directly since balance is already in wei format
    });
    
    toast.info('Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    await getBalance();
    await getTokenBalance();
    setWithdrawAmount(0);
    toast.success('Withdrawal successful!');
  } catch (error) {
    console.error("Error making withdrawal:", error);
    toast.error('Withdrawal failed!');
  } finally {
    setIsWaitingTx(false);
  }
};

  const handleBreakLock = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsWaitingTx(true);

    try {
      const tokenAddress = getTokenAddress(selectedToken);

      toast.info('Processing timelock break...');

      const { hash } = await writeContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: 'breakTimelock',
        args: [tokenAddress],
      });

      toast.info('Waiting for confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      await getBalance();
      await getTokenBalance();
      toast.success('Timelock broken successfully!');
    } catch (error) {
      console.error("Error breaking timelock:", error);
      toast.error('Error breaking timelock');
    } finally {
      setIsWaitingTx(false);
    }
  };

  useEffect(() => {
    if (address) {
      getBalance();
      getTokenBalance();
    }
  }, [address, getBalance, getTokenBalance]);

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

  return (
    <MiniSafeContext.Provider value={value}>
      {children}
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