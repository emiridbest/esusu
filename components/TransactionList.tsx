import React, { useEffect, useState } from 'react';
import { celo } from 'viem/chains';
import { BrowserProvider } from 'ethers';
import { createPublicClient, http } from 'viem';
import { CheckIcon, MinusCircleIcon, PlusCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAddRecentTransaction } from '@rainbow-me/rainbowkit';
interface Transaction {
  args: {
    from: string;
    to: string;
    value: string;
  };
  transactionHash: string;
  key: number;
  status: boolean;
}

const STABLE_TOKEN_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

const truncateAddress = (address: string): string => {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
};
const TransactionList: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const addRecentTransaction = useAddRecentTransaction();
  const [address, setAddress] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      if (window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const userAddress = await signer.getAddress();
          setAddress(userAddress);
          const publicClient = createPublicClient({
            chain: celo,
            transport: http(),
          });

          // Fetching transactions from Celo Explorer API
          const response = await fetch(`https://explorer.celo.org/mainnet/api/?module=account&action=txlist&address=${userAddress}`);
          const data = await response.json();

          // Process the data into Transaction objects
          const txList: Transaction[] = data.result.map((tx: any, index: number) => ({
            args: {
              from: tx.from,
              to: tx.to,
              value: tx.value,
            },
            transactionHash: tx.hash,
            key: index,
            status: tx.isError === '0',
          }));

          setTransactions(txList);
        } catch (error) {
          console.error('Error fetching transactions:', error);
        }
      } else {
        console.error('Ethereum object not found');
      }
    };

    fetchTransactions();
  }, []); // Empty dependency array ensures useEffect runs once after initial render

  // Function to format the value of transactions
  function formatValue(value: string, decimals = 2): string {
    const balanceNumber = parseFloat(value);
    if (isNaN(balanceNumber)) {
      return "0.00";
    }
    return balanceNumber.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  return (
    <div className="container mx-auto p-4 lg:p-0">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold mb-4">Activity</h2>
        <button
          className="text-sm text-gray-400 mb-4"
          onClick={() => {
            addRecentTransaction({
              hash: '0x...',
              description: '...',
              confirmations: 100,
            });
          }}
        >
          ...recent transactions
        </button>
        <div className="bg-gypsum shadow-md rounded-lg p-4">
          {transactions && transactions.length > 0 ? (
            transactions.slice(0, 7).map((transaction, index) => (
              <div key={transaction.key} className={`flex flex-row gap-2 items-center justify-between p-4 mb-2 rounded-lg ${index % 2 === 0 ? 'bg-gypsum' : 'bg-gypsum'}`}>
                <div className="flex items-center gap-2">
                  {transaction.args.from !== address ? (
                    <MinusCircleIcon className="h-5 w-5 text-red-500" />
                  ) : (
                    <PlusCircleIcon className="h-5 w-5 text-green-500" />
                  )}
                  <div className="flex flex-col">
                    <p className="font-semibold text-gray-800">{transaction.args.from !== address ? truncateAddress(transaction.args.from) : truncateAddress(transaction.args.to)}</p>
                    <p className="text-gray-600 text-sm">{formatValue((parseFloat(transaction.args.value) * 1e-18).toFixed(18))} CELO</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {transaction.status ? (
                    <CheckIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <XMarkIcon className="h-5 w-5 text-red-500" />
                  )}
                  <a
                    href={`https://explorer.celo.org/mainnet/tx/${transaction.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 font-light text-sm"
                  >
                    View on CeloScan
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-400">Loading...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionList;