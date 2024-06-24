import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { contractAddress, abi } from '../../utils/pay';
import { BrowserProvider, Contract } from "ethers";
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import TransactionList from '@/components/TransactionList';
interface Merchant {
    [x: string]: any;
    id: number;
    name: string;
    address: string;
    description: string;
}

const Merchants: React.FC = () => {
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const router = useRouter();

    const getMerchants = useCallback(async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
                const userAddress = accounts[0];

                const provider = new BrowserProvider(window.ethereum);
                const signer = await provider.getSigner(userAddress);
                const contract = new Contract(contractAddress, abi, signer);

                const merchantIds = await contract.allMerchant();
                const formattedMerchants: Merchant[] = [];
                for (const merchantIdBN of merchantIds) {
                    const merchantId = parseInt(merchantIdBN);
                    const item = merchantId - 1;
                    const merchantDetail = await contract.getMerchantInfo(item);
                    formattedMerchants.push({ ...merchantDetail, key: item });
                }
                setMerchants(formattedMerchants);
            } catch (error) {
                console.error("Error fetching merchants:", error);
            }
        }
    }, []);

    useEffect(() => {
        getMerchants();
    }, [getMerchants]);

    const handleAddMerchant = () => {
        router.push('./utilityBills/merchantPage');
    };

    const handleModifyMerchant = (merchant: Merchant) => {
        router.push({
            pathname: '/utilityBills/modifyMerchant',
            query: { merchant: JSON.stringify(merchant) },
        });
    };

    const handlePayMerchant = (merchant: Merchant) => {
        router.push({
            pathname: '/utilityBills/payMerchant',
            query: { merchant: JSON.stringify(merchant), address: merchant.address },
        });
    };

    return (
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <div className="flex justify-end">
                <PlusCircleIcon
                    onClick={handleAddMerchant}
                    className="h-8 mt-4 text-black hover:bg-prosperity duration-150 rounded-full cursor-pointer"
                />
            </div>
            <div className="flex flex-col">
                <h3 className="text-gray-800 text-xl font-bold sm:text-2xl">
                    Available Merchants
                </h3>
                <p className="text-gray-600 mt-2">
                    Welcome to your No. 1 Stable coin payment gateway!!!
                </p>
            </div>

            <div className="mt-12">
            <table className="w-full table-auto  text-xs text-left">
                            <thead className="bg-black text-white">
                        <tr>
                            <th className="px-5 py-3 text-left  font-medium">Product Name</th>
                            <th className="px-5 py-3 text-left  font-medium">Description</th>
                            <th className="hidden lg:block px-5 py-3 text-left  font-medium">Address</th>
                            <th className="px-5 py-3 text-left  font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {merchants && merchants.map((merchant, index) => (
                            <tr key={index}>
                                <td className="px-5 py-3 text-left ">{merchant[1]}</td>
                                <td className="px-5 py-3 text-left ">{merchant[2]}</td>
                                <td className="hidden lg:block px-5 py-3 text-left  font-medium">{merchant[3]}</td>
                                <td className="px-3 py-2 sm:px-1 sm:py-4">
                                <button
                                        onClick={() => handlePayMerchant(merchant)}
                                        className="bg-prosperity text-black py-2 px-4 border rounded hover:bg-black hover:text-white mr-2"
                                    >
                                        Proceed
                                    </button>
                                    <button
                                        onClick={() => handleModifyMerchant(merchant)}
                                        className="hidden"
                                    >
                                        Modify
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <TransactionList />
        </div>
    );
};

export default Merchants;
