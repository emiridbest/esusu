import React, { useState, useCallback, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { contractAddress, abi } from '../../utils/abi';
import { BrowserProvider, Contract, formatUnits } from "ethers";
import { parseEther } from "viem";
import { motion } from "framer-motion";
import TransactionList from '@/components/TransactionList';
import { BigNumber } from 'alchemy-sdk';

// Shadcn/UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import {
  WalletIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  LockIcon,
  UnlockIcon,
  CoinsIcon,
  ClockIcon,
  ShieldIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  InfoIcon,
  LoaderCircleIcon
} from "lucide-react";



export default function MiniSafe() {
  const cUsdTokenAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  const celoAddress = "0x0000000000000000000000000000000000000000";
  const goodDollarAddress = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A"

  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [celoBalance, setCeloBalance] = useState('');
  const [cusdBalance, setCusdBalance] = useState('');
  const [goodDollarBalance, setGoodDollarBalance] = useState('');
  const [tokenBalance, setTokenBalance] = useState('');
  const [selectedToken, setSelectedToken] = useState('cUSD');
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
          setCeloBalance('0');

          const cUsdBalance = await contract.getBalance(userAddress, cUsdTokenAddress);
          if (cUsdBalance !== undefined) {
            const cUsdBalanceBigInt = formatUnits(cUsdBalance, 18);
            setCusdBalance(cUsdBalanceBigInt.toString());
          }
          const goodDollarBalance = await contract.getBalance(userAddress, celoAddress);
          if (goodDollarBalance !== undefined) {
            const goodDollarBalanceBigInt = formatUnits(goodDollarBalance, 18);
            setGoodDollarBalance(goodDollarBalanceBigInt.toString());
          }
        }
      } catch (error) {
        console.error("Error fetching balance:", error);
        toast.error("Error fetching balance");
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
        toast.error("Error fetching token balance");
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

        const tokenAddress = selectedToken === 'cUSD' ? cUsdTokenAddress : goodDollarAddress;
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
        if (selectedToken === 'cUSD') {
          tx = await contract.deposit(cUsdTokenAddress, depositValue, { gasLimit });
        } else if (selectedToken === 'CELO') {
          tx = await contract.deposit(celoAddress, depositValue, { gasLimit });
        } else if (selectedToken === 'G$') {
          tx = await contract.deposit(goodDollarAddress, depositValue, { gasLimit });
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
          tx = await contract.withdraw(celoAddress, { gasLimit });
        } else if (selectedToken === 'cUSD') {
          tx = await contract.withdraw(cUsdTokenAddress, { gasLimit });
        } else if( selectedToken === 'G$') {
          tx = await contract.withdraw(goodDollarAddress, { gasLimit });
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
        } else if (selectedToken === 'cUSD') {
          tx = await contract.breakTimelock(cUsdTokenAddress, { gasLimit });
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

  return (
    <div className="container mx-auto px-4 py-8">
      <ToastContainer position="bottom-right" theme="colored" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <ShieldIcon className="mr-3 h-8 w-8 text-primary" />
          MiniSafe
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-3xl">
          Deposit your assets into a secure, time-locked vault and earn rewards. Break the timelock early using EST tokens.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-gray-100 dark:border-gray-700 overflow-hidden h-full dark:text-white">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/70 via-primary/40 to-primary/10"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex items-center">
                <WalletIcon className="mr-2 h-5 w-5 text-primary" />
                My Savings
              </CardTitle>
              <CardDescription>Manage your secured assets</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">CELO Balance</div>
                      <Badge variant="outline" className="text-xs">Native Coin</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-md p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mr-2">
                          <CoinsIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="font-medium">CELO</span>
                      </div>
                      <div className="text-xl font-bold">{formatBalance(celoBalance)}</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">cUSD Balance</div>
                      <Badge variant="outline" className="text-xs">Stablecoin</Badge>
                    </div>
                    <div className="flex items-center justify-between  bg-gray-100 dark:bg-gray-800/50 rounded-md p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-2">
                          <CoinsIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="font-medium">cUSD</span>
                      </div>
                      <div className="text-xl font-bold">{formatBalance(cusdBalance)}</div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">G$ Balance</div>
                      <Badge variant="outline" className="text-xs">Stablecoin</Badge>
                    </div>
                    <div className="flex items-center justify-between  bg-gray-100 dark:bg-gray-800/50 rounded-md p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-2">
                          <CoinsIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium">G$</span>
                      </div>
                      <div className="text-xl font-bold">{formatBalance(goodDollarBalance)}</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400">EST Tokens</div>
                      <Badge className="bg-black text-primary hover:bg-black/70 text-xs">Reward Token</Badge>
                    </div>
                    <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent rounded-md p-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                          <CoinsIcon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">EST</span>
                      </div>
                      <div className="text-xl font-bold">{tokenBalance}</div>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Select token</div>
                <Select
                  value={selectedToken}
                  onValueChange={handleTokenChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cUSD">cUSD</SelectItem>
                    <SelectItem value="CELO">CELO</SelectItem>
                    <SelectItem value="G$">G$</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {parseFloat(cusdBalance) > 0 && (
                <Alert className="bg-primary/5 border-primary/20">
                  <div className="flex items-start">
                    <InfoIcon className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <AlertDescription className="text-sm">
                      Your assets are earning approximately {interestRate}% APY in EST tokens
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="border-t border-gray-100 dark:border-gray-700 pt-4 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center">
                <ClockIcon className="h-3 w-3 mr-1" />
                <span>Updated just now</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-gray-500"
                onClick={() => {
                  getBalance();
                  getTokenBalance();
                }}
              >
                <RefreshCwIcon className="h-3 w-3 mr-1 text-gray-500" />
                Refresh
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Operations Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-gray-100 dark:border-gray-700 overflow-hidden text-gray-900 dark:text-white">
            <CardHeader className="pb-2">
              <CardTitle>Vault Operations</CardTitle>
              <CardDescription>Deposit, withdraw or break timelocks</CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="deposit">
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value="deposit">Deposit</TabsTrigger>
                  <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                  <TabsTrigger value="breaklock">Break Lock</TabsTrigger>
                </TabsList>

                <TabsContent value="deposit">
                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                      <div className="flex items-center mb-4">
                        <ArrowDownIcon className="h-5 w-5 text-green-500 mr-2" />
                        <h3 className="text-base font-medium">Deposit {selectedToken}</h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Deposited assets are locked over time. You will earn EST tokens as rewards during this period.
                      </p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Amount</label>
                          <Input
                            type="number"
                            value={depositAmount || ''}
                            onChange={(e) => setDepositAmount(Number(e.target.value))}
                            placeholder={`Enter ${selectedToken} amount`}
                            min="0"
                            step="0.01"
                          />
                          {selectedToken === 'cUSD' && (
                            <p className="text-xs text-gray-500">Approve amount before depositing</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {selectedToken === 'cUSD' ? (
                            <>
                              <Button
                                variant={isApproved ? "outline" : "default"}
                                onClick={approveSpend}
                                disabled={isApproved || isApproving}
                              >
                                {isApproving ? (
                                  <LoaderCircleIcon className="h-4 w-4 animate-spin mr-2" />
                                ) : isApproved ? (
                                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                                ) : null}
                                {isApproved ? 'Approved' : 'Approve'}
                              </Button>

                              <Button
                                onClick={handleDeposit}
                                disabled={!isApproved || isWaitingTx}
                                className={!isApproved ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                {isWaitingTx ? (
                                  <LoaderCircleIcon className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <ArrowDownIcon className="h-4 w-4 mr-2" />
                                )}
                                Deposit
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={handleDeposit}
                              disabled={isWaitingTx}
                              className="col-span-2"
                            >
                              {isWaitingTx ? (
                                <LoaderCircleIcon className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <ArrowDownIcon className="h-4 w-4 mr-2" />
                              )}
                              Deposit {selectedToken}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-primary/5 p-4 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center">
                        <InfoIcon className="h-4 w-4 mr-2 text-primary" />
                        What happens when you deposit?
                      </h4>
                      <ul className="text-sm space-y-2 text-gray-600 dark:text-gray-300">
                        <li className="flex items-start">
                          <div className="mr-2 mt-1 bg-primary/20 text-primary h-4 w-4 rounded-full flex items-center justify-center text-xs">1</div>
                          <span>Your assets are locked in a smart contract</span>
                        </li>
                        <li className="flex items-start">
                          <div className="mr-2 mt-1 bg-primary/20 text-primary h-4 w-4 rounded-full flex items-center justify-center text-xs">1</div>
                          <span>Withdrawal window is between 28th to 30th day monthly </span>
                        </li>
                        <li className="flex items-start">
                          <div className="mr-2 mt-1 bg-primary/20 text-primary h-4 w-4 rounded-full flex items-center justify-center text-xs">2</div>
                          <span>You earn EST tokens proportional to your deposit amount</span>
                        </li>
                        <li className="flex items-start">
                          <div className="mr-2 mt-1 bg-primary/20 text-primary h-4 w-4 rounded-full flex items-center justify-center text-xs">3</div>
                          <span>EST tokens can be used to break the timelock early if needed</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="withdraw">
                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                      <div className="flex items-center mb-4">
                        <ArrowUpIcon className="h-5 w-5 text-blue-500 mr-2" />
                        <h3 className="text-base font-medium">Withdraw {selectedToken}</h3>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Lock time remaining</span>
                          <span className="text-sm">
                          {new Date().getDate() >= 28 && new Date().getDate() <= 31 ? 0 : Math.max(28 - new Date().getDate(), 0)} days left                          </span>
                        </div>
                        
                        <Progress value={Math.max(((28 - new Date().getDate()) / 28) * 100, 0)} 
                        className="h-2" />
                        <p className="text-xs text-gray-500 mt-2">
                          You can withdraw without penalty during withdrawal window
                        </p>
                      </div>

                      <Button
                        onClick={handleWithdraw}
                        disabled={new Date().getDate() < 28 || isWaitingTx}
                        className="w-full"
                      >
                        {isWaitingTx ? (
                          <LoaderCircleIcon className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ArrowUpIcon className="h-4 w-4 mr-2" />
                        )}
                        {new Date().getDate() < 28 ? 'Locked' : 'Withdraw All'}
                      </Button>

                      {new Date().getDate() < 28 && (
                        <p className="text-center text-sm text-red-500 mt-3">
                          <AlertCircleIcon className="h-4 w-4 inline mr-1" />
                          Your funds are still locked. Use Break Lock to withdraw early.
                        </p>
                      )}
                    </div>

                    <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <div className="flex items-start">
                        <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
                        <AlertDescription>
                          When you withdraw after the lock period, you will receive your original deposit plus any earned rewards.
                        </AlertDescription>
                      </div>
                    </Alert>
                  </div>
                </TabsContent>

                <TabsContent value="breaklock">
                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                      <div className="flex items-center mb-4">
                        <UnlockIcon className="h-5 w-5 text-amber-500 mr-2" />
                        <h3 className="text-base font-medium">Break Timelock</h3>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Use your EST tokens to break the timelock and withdraw your funds outside withdrawal window. This will consume your EST tokens.
                      </p>

                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
                        <div className="flex items-start">
                          <div className="mr-3 mt-0.5">
                            <LockIcon className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium mb-1">Required EST Tokens</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              You need <span className="font-bold">15 EST</span> tokens to break this timelock
                            </p>

                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs">Your balance:</span>
                              <span className="text-xs font-medium">{tokenBalance} EST</span>
                            </div>
                            <Progress
                              value={Math.min((parseInt(tokenBalance) / 15) * 100, 100)}
                              className="h-1.5 mt-1"
                            />

                            <p className="mt-2 text-xs">
                              {parseInt(tokenBalance) >= 15 ? (
                                <span className="text-green-600 dark:text-green-400">
                                  <CheckCircleIcon className="h-3 w-3 inline mr-1" />
                                  You have enough EST tokens
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">
                                  <AlertCircleIcon className="h-3 w-3 inline mr-1" />
                                  You need {15 - parseInt(tokenBalance)} more EST tokens
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="default"
                        onClick={handleBreakLock}
                        disabled={parseInt(tokenBalance) < 15 || isWaitingTx}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        {isWaitingTx ? (
                          <LoaderCircleIcon className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <UnlockIcon className="h-4 w-4 mr-2" />
                        )}
                        Break Lock & Withdraw
                      </Button>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">How it works</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Breaking the timelock early will consume your EST tokens. You will receive your original deposit plus any earned rewards.
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Note: EST tokens are non-transferable and can only be used to break timelocks.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Transaction History */}
      <div className="mt-8">
        <TransactionList />
      </div>
    </div>
  );
}
