import React, { useState, useCallback, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { contractAddress, abi } from '../../utils/abi';
import { BrowserProvider, Contract, formatUnits } from "ethers";
import { CurrencyDollarIcon, CurrencyEuroIcon, CurrencyPoundIcon } from "@heroicons/react/24/outline";
import TransactionList from '@/components/TransactionList';
import { BigNumber } from 'alchemy-sdk';
import { parseEther } from "viem";

const Loader = ({ alt }: { alt?: boolean }) => (
  <div className={`loader ${alt ? 'loader-alt' : ''}`}>Loading...</div>
);


export default function Home() {
  const cUsdTokenAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  const celoAddress = "0x0000000000000000000000000000000000000000";

  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [celoBalance, setCeloBalance] = useState('');
  const [cusdBalance, setCusdBalance] = useState('');
  const [tokenBalance, setTokenBalance] = useState('');
  const [selectedToken, setSelectedToken] = useState('cUSD');
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isWaitingTx, setIsWaitingTx] = useState(false);
  const [buttonText, setButtonText] = useState('Approve');

  const getBalance = useCallback(async () => {
    if (window.ethereum) {
      try {
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
          setCeloBalance(celoBalanceBigInt.toString());

          const cUsdBalance = await contract.getBalance(userAddress, cUsdTokenAddress);
          if (cUsdBalance !== undefined) {
            const cUsdBalanceBigInt = formatUnits(cUsdBalance, 18);
            setCusdBalance(cUsdBalanceBigInt.toString());
          }
        }
      } catch (error) {
        console.error("Error fetching balance:", error);
        toast.error("Error fetching balance");
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

  const handleTokenChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedToken(event.target.value);
  };

  const approveSpend = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsApproving(true);

    if (window.ethereum) {
      try {
        let accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        let userAddress = accounts[0];

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(userAddress);

        // Ensure depositAmount is valid
        if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
          toast.error('Invalid deposit amount');
          setIsApproving(false);
          return;
        }

        const depositValue = parseEther(depositAmount.toString());
        const gasLimit = parseInt("600000");

        const tokenAddress = selectedToken === 'cUSD' ? cUsdTokenAddress : celoAddress;
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
          let tx = await tokenContract.approve(contractAddress, depositValue, { gasLimit });
          setButtonText('Approving...');
          await tx.wait();
          setIsApproved(true);
          toast.success('Approval successful!');
        }
      } catch (error) {
        console.error("Error approving spend:", error);
        setIsApproved(false);
        toast.error('Approval failed!');
      }
    } else {
      toast.error('Ethereum object not found');
    }

    setIsApproving(false);
  };


  const handleDeposit = async (event: React.FormEvent, selectedToken: string, depositAmount: number) => {
    event.preventDefault();
    if (!depositAmount || !selectedToken) return;
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

        let tx;
        if (selectedToken === 'cUSD') {
          tx = await contract.deposit(cUsdTokenAddress, depositValue, { gasLimit });

        }
        else if (selectedToken === 'CELO') {
          tx = await contract.deposit(celoAddress, depositValue, { gasLimit });
        }
        const receipt = await tx.wait();

        if (receipt.status === 1) {
          console.log('Deposit successful');
          getBalance();
          getTokenBalance();
          setDepositAmount(0);
          setIsApproved(false);
          toast.success('Deposit successful!');
        } else {
          console.error('Transaction failed:', receipt);
          toast.error('Deposit failed!');
        }
      }
    } catch (error) {
      console.error("Error making deposit:", error);
      toast.error('Deposit failed!');
    }

    setIsWaitingTx(false);
    setButtonText('Deposit');
  };

  const handleWithdraw = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!withdrawAmount || !selectedToken) return;
    if (window.ethereum) {
      let accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      let userAddress = accounts[0];
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(userAddress);
      const contract = new Contract(contractAddress, abi, signer);
      const withdrawValue = parseEther(withdrawAmount.toString());
      const gasLimit = parseInt("600000");

      try {
        let tx;
        if (selectedToken === 'CELO') {
          tx = await contract.withdraw(celoAddress, withdrawValue, { gasLimit });
        } else if (selectedToken === 'cUSD') {
          tx = await contract.withdraw(cUsdTokenAddress, withdrawValue, { gasLimit });
        }
        await tx.wait();
        getBalance();
        getTokenBalance();
        setWithdrawAmount(0);
        toast.success('Withdrawal successful!');
      } catch (error) {
        console.error("Error making withdrawal:", error);
        toast.error('Withdrawal failed!');
      }
    }
  };

  const handleBreakLock = async () => {
    if (window.ethereum) {
      let accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      let userAddress = accounts[0];
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(userAddress);
      const contract = new Contract(contractAddress, abi, signer);
      const gasLimit = parseInt("600000");

      try {
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
      }
    }
  };

  useEffect(() => {
    getBalance();
    getTokenBalance();
  }, [getBalance, getTokenBalance]);

  return (
    <div className="container mx-auto p-4 lg:p-0">
      <ToastContainer />
      <div className="flex flex-col lg:flex-row text-sm ">
        <aside className="w-full lg:w-1/3 p-4">
          <div className="bg-gradient-to-br from-gypsum to-gray-50 bg-opacity-75 backdrop-filter backdrop-blur-lg border border-gray-300 rounded-lg shadow-lg">
            <div className="p-6">
              <h3 className="font-semibold text-black mb-4 text-lg">My Savings</h3>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600"><CurrencyDollarIcon className="mr-2 text-black" />CELO:</span>
                  <span className="text-black text-2xl font-bold">{celoBalance} CELO</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600"><CurrencyDollarIcon className="mr-2 text-black" />cUSD:</span>
                  <span className="text-black text-2xl font-bold">{cusdBalance} cUSD</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600"><CurrencyPoundIcon className="mr-2 text-black" />EST:</span>
                  <span className="text-black text-2xl font-bold">{tokenBalance} EST</span>
                </div>
              </div>
              <div>
                <label htmlFor="token-select" className="block text-gray-600 mb-2">Select token you want to deposit</label>
                <select
                  id="token-select"
                  value={selectedToken}
                  onChange={handleTokenChange}
                  className="w-full rounded-md p-2 shadow bg-prosperity text-black hover:bg-black hover:text-gray-700"
                >
                  <option value="cUSD"><CurrencyDollarIcon className="mr-2" />cUSD</option>
                  <option value="CELO"><CurrencyDollarIcon className="mr-2" />CELO</option>
                </select>
              </div>
            </div>
          </div>
        </aside>
        <main className="w-full lg:w-2/3 p-4">
          <div className="bg-gypsum p-6 rounded-lg shadow-md mb-4 bg-gradient-to-br from-gypsum to-gray-50 bg-opacity-75 backdrop-filter backdrop-blur-lg border border-gray-300 rounded-lg shadow-lg">
            <div className="bg-gypsum p-6 rounded-lg shadow-md mb-4 bg-gradient-to-br from-gypsum to-gray-50 bg-opacity-75 backdrop-filter backdrop-blur-lg border border-gray-300 rounded-lg shadow-lg">
              <h3 className="text-sm font-semibold text-black mb-2">Deposit</h3>
              <form
                className="mb-4">
                <div className="mb-4">
                  <label className="text-sm font-light text-gray-500 mb-2" htmlFor="deposit-amount">Amount</label>
                  <label className="flex text-xs font-light text-gray-500 mb-2" htmlFor="deposit-amount">Approve amount before depositing...</label>
                  <input
                    type="number"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="border rounded px-4 py-2 w-full mb-2 text-black"
                  />
                </div>
                <button
                  disabled={isApproved}
                  onClick={(e) => approveSpend(e)}
                  className={`${!isApproved
                    ? "text-black/100 bg-prosperity hover:bg-black hover:text-white"
                    : "bg-black/10 cursor-not-allowed text-white"
                    } inline-flex w-full text-black items-center justify-center rounded-md p-2 mb-2 `}                >
                  {isApproving ? <Loader alt /> : "Approve"}
                </button>
                <button
                  disabled={!isApproved}
                  onClick={(e) => handleDeposit(e, selectedToken, depositAmount)}
                  className={`${isApproved
                    ? "text-black/100 bg-prosperity hover:bg-black hover:text-white"
                    : "bg-black/10 cursor-not-allowed text-white hover:bg-black e"
                    } inline-flex w-full items-center justify-center rounded-md p-2`}
                >
                  {isWaitingTx ? <Loader alt /> : "Deposit"}
                </button>
              </form>
            </div>
            <div className="bg-gypsum p-6 rounded-lg shadow-md mb-4 bg-gradient-to-br from-gypsum to-gray-50 bg-opacity-75 backdrop-filter backdrop-blur-lg border border-gray-300 rounded-lg shadow-lg">
              <h3 className="text-sm font-semibold text-black mb-2">Withdraw</h3>
              <form onSubmit={handleWithdraw}>
                <div className="mb-4">
                  <label className="text-sm font-light text-gray-500 mb-2" htmlFor="withdraw-amount">Amount</label>
                  <input
                    id="withdraw-amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full border border-gray-300 p-2 rounded-md"
                    type="text"
                    placeholder="Amount to withdraw"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-prosperity shadow text-black py-2 rounded-md hover:bg-black hover:text-white transition"
                >
                  Withdraw
                </button>
              </form>
            </div>
            <div className="bg-gypsum p-6 rounded-lg shadow-md mb-4 bg-gradient-to-br from-gypsum to-gray-50 bg-opacity-75 backdrop-filter backdrop-blur-lg border border-gray-300 rounded-lg shadow-lg">
              <h3 className="text-sm font-semibold text-black mb-2">Break Timelock</h3>
              <h3 className="text-sm font-light text-gray-500 mb-2">Ensure you have enough EST tokens</h3>

              <button
                onClick={handleBreakLock}
                className="w-full bg-prosperity shadow text-black py-2 rounded-md hover:bg-black hover:text-white transition"
              >
                Breaklock
              </button>
            </div>
          </div>
        </main>
        <aside className="w-full lg:w-1/3 p-4 border rounded-md">
          <TransactionList />

        </aside>
      </div>
    </div>
  );
}
