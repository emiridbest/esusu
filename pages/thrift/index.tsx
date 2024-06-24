import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { contractAddress, abi } from '@/utils/esusu';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import { PlusCircleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import TransactionList from '@/components/TransactionList';

export interface Campaign {
    [x: string]: any;
    name: string;
    description: string;
    contributionAmount: number;
    payoutInterval: number;
    lastPayoutBlock: number;
    totalContributions: number;
    userName: string[];
    id: number;
    key: number;
}

const Thrift: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const router = useRouter();

    const getCampaigns = useCallback(async () => {
        setLoading(true);
        setError('');
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
                const userAddress = accounts[0];

                const provider = new BrowserProvider(window.ethereum);
                const signer = await provider.getSigner(userAddress);
                const contract = new Contract(contractAddress, abi, signer);

                const campaignIds = await contract.getAllCampaigns();
                const formattedCampaigns: Campaign[] = [];

                for (const campaignIdBN of campaignIds) {
                    const campaignId = parseInt(campaignIdBN);
                    const campaignDetail = await contract.getCampaignDetails(campaignId);
                    formattedCampaigns.push({
                        ...campaignDetail,
                        id: campaignId,
                        key: campaignId,
                    });
                }
                setCampaigns(formattedCampaigns);
            } catch (error) {
                console.error("Error fetching campaigns:", error);
                setError('Failed to load campaigns. Please try again.');
            }
        } else {
            setError('Ethereum wallet is not connected. Please connect your wallet.');
        }
        setLoading(false);
    }, []);

    const handleCreateCampaign = () => {
        router.push('/thrift/addCampaign');
    };

    const handleCampaignDetails = (campaign: Campaign) => {
        router.push({
            pathname: '/thrift/campaignDetails',
            query: { campaign: JSON.stringify(campaign), id: campaign.id },
        });
        setSelectedCampaign(campaign);
    };

    useEffect(() => {
        getCampaigns();
    }, [getCampaigns]);

    

    return (
        <div className="container mx-auto p-4 lg:p-0 font-arial">
            <div className="flex  justify-center max-w-lg mt-4">
                <h3 className="text-black font-bold sm:text-2xl">
                    Available Campaigns
                </h3>

            </div>
            <div className="flex justify-end">
                <PlusCircleIcon
                    onClick={handleCreateCampaign}
                    className="h-8 mb-4 text-black hover:bg-prosperity duration-150 rounded-full cursor-pointer"
                />
            </div>
            {loading ? (
                <div className="flex justify-center items-center">
                    <p className="text-gray-600">Loading campaigns...</p>
                </div>
            ) : error ? (
                <div className="flex justify-center items-center">
                    <p className="text-red-600">{error}</p>
                </div>
            ) : (
                <div className="overflow-x-auto ">
                    <div className="overflow-x-hidden">
                        <table className="w-full table-auto text-sm text-left">
                            <thead className="bg-black text-white">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-medium">Campaign</th>
                                    <th className="px-5 py-3 text-left text-xs font-medium">Description</th>
                                    <th className="px-5 py-3 text-left text-xs font-medium">Amount</th>
                                    <th className="px-5 py-3 text-left text-xs font-medium hidden sm:table-cell">Users</th>
                                    <th className="px-5 py-3 text-left text-xs font-medium hidden sm:table-cell">Total</th>
                                    <th className="px-5 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {campaigns.map((campaign, index) => (
                                    <tr key={campaign.key} className={index % 2 === 0 ? 'bg-gypsum' : 'bg-gypsum'}>
                                      <td className="px-5 py-4 whitespace-wrap">{campaign[0]}</td>
                                    <td className="px-5 py-4 whitespace-wrap sm:max-w-[15rem] sm:whitespace-normal sm:line-clamp-3">{campaign[1]}</td>
                                    <td className="px-5 py-4 whitespace-wrap"><CurrencyDollarIcon className='h-5 w-auto'/>{campaign[2].toString()}</td>
                                    <td className="px-5 py-4 whitespace-wrap hidden sm:table-cell">{campaign[6]}</td>
                                    <td className="px-5 py-4 whitespace-wrap hidden sm:table-cell">{campaign[5].toString()}</td>
                                    <td className="px-5 py-4 whitespace-wrap">
                                        <button onClick={() => handleCampaignDetails(campaign)} className="text-gray-600 font-light hover:text-indigo-900">See Details</button>
                                    </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <TransactionList />
        </div>
    );
};

export default Thrift;
