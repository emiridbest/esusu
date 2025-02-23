import React, { useEffect, useState } from 'react';
import { celo } from 'viem/chains';
import { createPublicClient, http, decodeFunctionData,  } from 'viem';
import { useAccount } from 'wagmi';
import { stableTokenABI } from "@celo/abis";
import { CheckIcon, MinusCircleIcon, PlusCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAddRecentTransaction } from '@rainbow-me/rainbowkit';
import { BlockNumber } from "viem";

interface Transaction {
  args: {
    from: string;
    to: string;
    value: string;
    functionName: string;
  };
  transactionHash: string;
  key: number;
  status: boolean;
}

const STABLE_TOKEN_ADDRESS = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"; //'0x765DE816845861e75A25fCA122bb6898B8B1282a';

const truncateAddress = (address: string): string => {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
};

const TransactionList: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const addRecentTransaction = useAddRecentTransaction();
  const { address } = useAccount();

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!address) {
        console.error('No address found');
        return;
      }

      try {
        const publicClient = createPublicClient({
          chain: celo,
          transport: http(),
        });

        const getPastYearBlockNumber = async (publicClient: any) => {
          const currentTime = Math.floor(Date.now() / 1000);
          const oneYearAgoTime = currentTime - 365 * 24 * 60 * 60; // Subtract 365 days

          const response = await fetch(`https://api.celoscan.io/api?module=block&action=getblocknobytime&timestamp=${oneYearAgoTime}&closest=after&apikey=PEAMBX9SFYMY8MBJTJXTFDV568WBDIB3VK`);
          const data = await response.json();

          return data.result; // This should be the block number from 365 days ago
        };

        const getCurrentBlockNumber = async (publicClient: any) => {
          const currentTime = Math.floor(Date.now() / 1000);
          const response = await fetch(`https://api.celoscan.io/api?module=block&action=getblocknobytime&timestamp=${currentTime}&closest=after&apikey=PEAMBX9SFYMY8MBJTJXTFDV568WBDIB3VK`);
          const data = await response.json();

          return data.result; // This should be the block number from 365 days ago
        };
        const pastYearBlockNumber = await getPastYearBlockNumber(publicClient);
        const latestBlock = await getCurrentBlockNumber(publicClient);



        // Fetching transactions from Celo Explorer API
        const response = await fetch(`https://api.celoscan.io/api?module=account&action=txlist&address=${address}&startblock=${pastYearBlockNumber}&endblock=${latestBlock}&page=${page}&offset=10&sort=desc&apikey=PEAMBX9SFYMY8MBJTJXTFDV568WBDIB3VK`);
        const data = await response.json();
        console.log('API response:', data);

        if (Array.isArray(data.result)) {
          // Process the data into Transaction objects
          const txList: Transaction[] = data.result.map((tx: any, index: number) => {
            let functionName = '';
            try {
              const decodedInput = decodeFunctionData({
                abi: stableTokenABI,
                data: tx.input,
              });
              functionName = decodedInput?.functionName || 'Unknown Function';
            } catch (e) {
              console.error('Failed to decode input data:', e);
            }

            return {
              args: {
                from: tx.from,
                to: tx.to,
                value: tx.value,
                functionName,
              },
              transactionHash: tx.hash,
              key: index,
              status: tx.isError === '0',
            };
          });

          setTransactions((prevTransactions) => [...prevTransactions, ...txList]);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, [address, page]); // Dependency array ensures useEffect runs when address or page changes

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
            transactions.map((transaction, index) => (
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
                    <p className="text-gray-600 text-sm">{transaction.args.functionName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {transaction.status ? (
                    <CheckIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <XMarkIcon className="h-5 w-5 text-red-500" />
                  )}
                  <a
                    href={`https://celoscan.io/tx/${transaction.transactionHash}`}
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
          <button
            className="text-sm text-gray-400 mt-4"
            onClick={() => setPage(page + 1)}
          >
            See more
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;