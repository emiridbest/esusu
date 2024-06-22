import React, { useState, useCallback, useEffect } from 'react';
import { contractAddress, abi } from '../../utils/abi';
import { BrowserProvider, Contract, parseEther, formatUnits } from "ethers";
import { CurrencyDollarIcon, CurrencyEuroIcon, CurrencyPoundIcon } from "@heroicons/react/24/outline";

const Loader = ({ alt }: { alt?: boolean }) => (
  <div className={`loader ${alt ? 'loader-alt' : ''}`}>Loading...</div>
);

export default function Home() {
  const cUsdTokenAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  const celoAddress = "0x0000000000000000000000000000000000000000";

  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [celoBalance, setCeloBalance] = useState<string>('');
  const [cusdBalance, setCusdBalance] = useState<string>('');
  const [tokenBalance, setTokenBalance] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<string>('cUSD');
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isWaitingTx, setIsWaitingTx] = useState<boolean>(false);
  const [buttonText, setButtonText] = useState<string>('Approve');


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
      }
    }
  }, []);

  const handleTokenChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedToken(event.target.value);
  };

  const approveSpend = async (amount: string) => {
    setIsApproving(true);
    setButtonText('Approving');
    if (window.ethereum) {
      let accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      let userAddress = accounts[0];
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(userAddress);
      const contract = new Contract(contractAddress, abi, signer);
      const depositValue = parseEther(amount);
      const gasLimit = parseInt("600000");

      try {
        let tx = await contract.approve(cUsdTokenAddress, depositValue, { gasLimit });
        setButtonText('Approving...');
        await tx.wait();
        setIsApproved(true);
        setButtonText('Deposit');
      } catch (error) {
        console.error("Error approving spend:", error);
        setIsApproved(false);
      }
    }
    setIsApproving(false);
  };

  const handleDeposit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!depositAmount || !selectedToken) return;

    setIsWaitingTx(true);

    if (selectedToken === 'cUSD' && !isApproved) {
      await approveSpend(depositAmount.toString());
      if (!isApproved) {
        console.error('Token approval failed');
        setIsWaitingTx(false);
        return;
      }
    }

    if (window.ethereum) {
      let accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      let userAddress = accounts[0];
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(userAddress);
      const contract = new Contract(contractAddress, abi, signer);
      const depositValue = parseEther(depositAmount.toString());
      const gasLimit = parseInt("600000");

      try {
        let tx;
        if (selectedToken === 'CELO') {
          tx = await contract.deposit(celoAddress, depositValue, { gasLimit });
        } else if (selectedToken === 'cUSD') {
          tx = await contract.deposit(cUsdTokenAddress, depositValue, { gasLimit });
        }
        await tx.wait();
        console.log('Deposit successful');
        getBalance();
        getTokenBalance();
        setDepositAmount(0);
        setIsApproved(false);
      } catch (error) {
        console.error("Error making deposit:", error);
      }
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

      if (selectedToken === 'CELO') {
        let tx = await contract.withdraw(celoAddress, withdrawValue, { gasLimit });
        await tx.wait();
      } else if (selectedToken === 'cUSD') {
        let tx = await contract.withdraw(cUsdTokenAddress, withdrawValue, { gasLimit });
        await tx.wait();
      }
      getBalance();
      getTokenBalance();
      setWithdrawAmount(0);
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

      if (selectedToken === 'CELO') {
        let tx = await contract.breakTimelock(celoAddress, { gasLimit });
        await tx.wait();
      } else if (selectedToken === 'cUSD') {
        let tx = await contract.breakTimelock(cUsdTokenAddress, { gasLimit });
        await tx.wait();
      }
      getBalance();
      getTokenBalance();
    }
  };

  useEffect(() => {
    getBalance();
    getTokenBalance();
  }, [getBalance, getTokenBalance]);

  return (
    <div className="container mx-auto p-4 lg:p-0">
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
                  className="w-full border border-gray-300 rounded-md p-2 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
            <form onSubmit={handleDeposit}>
              <div className="mb-4">
                <label className="text-sm font-light text-gray-500 mb-2" htmlFor="deposit-amount">Amount</label>
                <label className="flex text-xs font-light text-gray-500 mb-2" htmlFor="deposit-amount">Approve amount before depositing...</label>
                <input
                  id="deposit-amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full border border-gray-300 p-2 rounded-md"
                  type="text"
                  placeholder="Amount to deposit"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white py-2 rounded-md hover:text-gypsum transition"
              >
                {isWaitingTx ? <Loader alt /> : buttonText}
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
                className="w-full bg-black text-white py-2 rounded-md hover:text-gypsum transition"
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
              className="w-full bg-black text-white py-2 rounded-md  hover:text-gypsum transition"
            >
Breaklock            </button>
            </div>
            </div>
        </main>
      </div>
    </div>
  );
}
