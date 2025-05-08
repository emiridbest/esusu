import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { contractAddress, abi } from '@/utils/abi';
import { BrowserProvider, Contract, formatUnits } from "ethers";
import { parseEther } from "viem";
import { BigNumber } from 'alchemy-sdk';

interface MiniSafeContextType {
  // Token addresses
  UsdcTokenAddress: string;
  celoAddress: string;
  goodDollarAddress: string;
  
  // State values
  depositAmount: number;
  setDepositAmount: (amount: number) => void;
  withdrawAmount: number;
  setWithdrawAmount: (amount: number) => void;
  celoBalance: string;
  usdcBalance: string;
  goodDollarBalance: string;
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
  const UsdcTokenAddress = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
  const celoAddress = "0x471EcE3750Da237f93B8E339c536989b8978a438";
  const goodDollarAddress = "0x471EcE3750Da237f93B8E339c536989b8978a438"; //"0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A";
  
  // State values
  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [celoBalance, setCeloBalance] = useState('');
  const [usdcBalance, setUsdcBalance] = useState('');
  const [goodDollarBalance, setGoodDollarBalance] = useState('');
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

        const balanceStruct = await contract.balances(userAddress);
        if (balanceStruct && balanceStruct.celoBalance !== undefined) {
          const celoBalanceBigInt = formatUnits(balanceStruct.celoBalance, 18);
          setCeloBalance(celoBalanceBigInt);

          const usdcBalance = await contract.getTokenBalance(UsdcTokenAddress);
          if (usdcBalance !== undefined) {
            const usdcBalanceBigInt = formatUnits(usdcBalance, 18);
            setUsdcBalance(usdcBalanceBigInt);
          }
          const goodDollarBalance = await contract.getBalance(goodDollarAddress);
          if (goodDollarBalance !== undefined) {
            const goodDollarBalanceBigInt = formatUnits(goodDollarBalance, 18);
            setGoodDollarBalance(goodDollarBalanceBigInt);
          }
        }
      } catch (error) {
       return;
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

        const tokenAddress = selectedToken === 'USDC' ? UsdcTokenAddress : goodDollarAddress;
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
          tx = await contract.depositToAave(UsdcTokenAddress, depositValue, { gasLimit });
        } else if (selectedToken === 'CELO') {
          tx = await contract.depositToAave(celoAddress, depositValue, { gasLimit });
        } else if (selectedToken === 'G$') {
          tx = await contract.depositToAave(goodDollarAddress, depositValue, { gasLimit });
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
        if (selectedToken === 'CELO') {
          tx = await contract.withdrawFromAave(celoAddress, { gasLimit });
        } else if (selectedToken === 'USDC') {
          tx = await contract.withdrawFromAave(UsdcTokenAddress, { gasLimit });
        } else if( selectedToken === 'G$') {
          tx = await contract.withdrawFromAave(goodDollarAddress, { gasLimit });
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
        if (selectedToken === 'CELO') {
          tx = await contract.breakTimelock(celoAddress, { gasLimit });
        } else if (selectedToken === 'USDC') {
          tx = await contract.breakTimelock(UsdcTokenAddress, { gasLimit });
        } else if (selectedToken === 'G$') {
          tx = await contract.breakTimelock(goodDollarAddress, { gasLimit });
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
    UsdcTokenAddress,
    celoAddress,
    goodDollarAddress,
    
    // State values
    depositAmount,
    setDepositAmount,
    withdrawAmount,
    setWithdrawAmount,
    celoBalance,
    usdcBalance, 
    goodDollarBalance,
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