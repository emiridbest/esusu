import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { contractAddress, abi } from '@/utils/abi';
import { BrowserProvider, Contract, formatUnits } from "ethers";
import { parseEther } from "viem";
import { BigNumber } from 'alchemy-sdk';

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
  const cusdAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  const usdtAddress = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";

  // State values
  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [cusdBalance, setcusdBalance] = useState('');
  const [usdcBalance, setUsdcBalance] = useState('');
  const [usdtBalance, setusdtBalance] = useState('');
  const [tokenBalance, setTokenBalance] = useState('');
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isWaitingTx, setIsWaitingTx] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [interestRate] = useState(5); // 5% APY for visualization

  const getBalance = useCallback(async () => {
    if (window.ethereum) {
      try {
        setIsLoading(true);
        let accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        let userAddress = accounts[0];

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(userAddress);
        const contract = new Contract(contractAddress, abi, signer);

        const cusdBalance = await contract.getBalance(userAddress, cusdAddress);
        if (cusdBalance !== undefined) {
          const cusdBalanceBigInt = formatUnits(cusdBalance);
          setcusdBalance(cusdBalanceBigInt);
        }
        const usdcBalance = await contract.getBalance(userAddress, usdcAddress);
        if (usdcBalance !== undefined) {
          const usdcBalanceBigInt = formatUnits(usdcBalance);
          setUsdcBalance(usdcBalanceBigInt);
        }
        const usdtBalance = await contract.getBalance(userAddress, usdtAddress);
        if (usdtBalance !== undefined) {
          const usdtBalanceBigInt = formatUnits(usdtBalance);
          setusdtBalance(usdtBalanceBigInt);
        }
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const getTokenBalance = useCallback(async () => {
    if (window.ethereum) {
      try {
        let accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        let userAddress = accounts[0];

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(userAddress);
        const contract = new Contract(contractAddress, abi, signer);

        const tokenBalance = await contract.balanceOf(userAddress);
        if (tokenBalance !== undefined) {
          const tokenBalanceBigInt = formatUnits(tokenBalance, 0);
          setTokenBalance(tokenBalanceBigInt.toString());
        }
      } catch (error) {
        console.error("Error fetching token balance:", error);
        // be silent for now 
        return;
        // toast.error("Error fetching token balance");
      }
    }
  }, []);

  const handleTokenChange = (value: string) => {
    setSelectedToken(value);
  };

  const approveSpend = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsApproving(true);

    if (window.ethereum) {
      try {
        let accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        let userAddress = accounts[0];

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(userAddress);

        const depositValue = parseEther(depositAmount.toString());
        const gasLimit = parseInt("600000");

        const tokenAddress = selectedToken === 'USDC' ? usdcAddress : usdtAddress;
        const tokenAbi = [
          "function allowance(address owner, address spender) view returns (uint256)",
          "function approve(address spender, uint256 amount) returns (bool)"
        ];
        const tokenContract = new Contract(tokenAddress, tokenAbi, signer);

        const allowance = await tokenContract.allowance(userAddress, contractAddress);
        const allowanceBigNumber = BigNumber.from(allowance);

        if (allowanceBigNumber.gte(depositValue)) {
          setIsApproved(true);
          toast.success('Already approved!');
        } else {
          toast.info('Approving transaction...');
          let tx = await tokenContract.approve(contractAddress, depositValue, { gasLimit });
          await tx.wait();
          setIsApproved(true);
          toast.success('Approval successful!');
        }
      } catch (error) {
        console.error("Error approving spend:", error);
        setIsApproved(false);
        toast.error('Approval failed!');
      } finally {
        setIsApproving(false);
      }
    } else {
      toast.error('Ethereum object not found');
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || !selectedToken) {
      toast.error('Please enter an amount and select a token');
      return;
    }

    setIsWaitingTx(true);
    try {
      if (window.ethereum) {
        let accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        let userAddress = accounts[0];
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(userAddress);
        const contract = new Contract(contractAddress, abi, signer);
        const depositValue = parseEther(depositAmount.toString());
        const gasLimit = parseInt("6000000");

        toast.info('Processing deposit...');
        let tx;
        if (selectedToken === 'USDC') {
          tx = await contract.depositToAave(usdcAddress, depositValue, { gasLimit });
        } else if (selectedToken === 'CUSD') {
          tx = await contract.depositToAave(cusdAddress, depositValue, { gasLimit });
        } else if (selectedToken === 'USDT') {
          tx = await contract.depositToAave(usdtAddress, depositValue, { gasLimit });
        }
        const receipt = await tx.wait();

        if (receipt.status === 1) {
          getBalance();
          getTokenBalance();
          setDepositAmount(0);
          setIsApproved(false);
          toast.success('Deposit successful!');
        } else {
          toast.error('Deposit failed!');
        }
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

    setIsWaitingTx(true);
    if (window.ethereum) {
      try {
        let accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        let userAddress = accounts[0];
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(userAddress);
        const contract = new Contract(contractAddress, abi, signer);
        const gasLimit = parseInt("600000");

        toast.info('Processing withdrawal...');
        let tx;
        if (selectedToken === 'CUSD') {
          tx = await contract.withdrawFromAave(cusdAddress, { gasLimit });
        } else if (selectedToken === 'USDC') {
          tx = await contract.withdrawFromAave(usdcAddress, { gasLimit });
        } else if (selectedToken === 'USDT') {
          tx = await contract.withdrawFromAave(usdtAddress, { gasLimit });
        }
        await tx.wait();
        getBalance();
        getTokenBalance();
        setWithdrawAmount(0);
        toast.success('Withdrawal successful!');
      } catch (error) {
        console.error("Error making withdrawal:", error);
        toast.error('Withdrawal failed!');
      } finally {
        setIsWaitingTx(false);
      }
    }
  };

  const handleBreakLock = async () => {
    setIsWaitingTx(true);
    if (window.ethereum) {
      try {
        let accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        let userAddress = accounts[0];
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(userAddress);
        const contract = new Contract(contractAddress, abi, signer);
        const gasLimit = parseInt("600000");

        toast.info('Processing timelock break...');
        let tx;
        if (selectedToken === 'CUSD') {
          tx = await contract.breakTimelock(cusdAddress, { gasLimit });
        } else if (selectedToken === 'USDC') {
          tx = await contract.breakTimelock(usdcAddress, { gasLimit });
        } else if (selectedToken === 'USDT') {
          tx = await contract.breakTimelock(usdtAddress, { gasLimit });
        }
        await tx.wait();
        getBalance();
        getTokenBalance();
        toast.success('Timelock broken successfully!');
      } catch (error) {
        console.error("Error breaking timelock:", error);
        toast.error('Error breaking timelock');
      } finally {
        setIsWaitingTx(false);
      }
    }
  };

  useEffect(() => {
    getBalance();
    getTokenBalance();
  }, [getBalance, getTokenBalance]);

  const formatBalance = (balance: string, decimals = 2) => {
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
