import React, { useState, useCallback, useEffect } from 'react';
import { contractAddress, abi } from '@/utils/esusu';
import { BrowserProvider, Contract, VoidSigner, parseEther } from 'ethers';
import CampaignModal from '@/utils/campaign';
import CampaignDetailsModal from '@/utils/campaignDetails';
export interface Campaign {
    [x: string]: any;
    name: string;
    description: string;
    contributionAmount: number;
    payoutInterval: number;
    lastPayoutBlock: number;
    totalContributions: number;
    userName: [string];
    id: number;
}

const Esusu: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign>();
    const [campaignModalOpen, setCampaignModalOpen] = useState(false);
    const [campaignDetailsModalOpen, setCampaignDetailsModalOpen] = useState(false);
    const getCampaigns = useCallback(async () => {
        if (window.ethereum) {
            try {
                let accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
                let userAddress = accounts[0];

                const provider = new BrowserProvider(window.ethereum);
                const signer = await provider.getSigner(userAddress);
                const contract = new Contract(contractAddress, abi, signer);

                let campaignIds = await contract.getAllCampaigns();
                const formattedCampaigns: Campaign[] = [];
                for (const campaignIdBN of campaignIds) {
                    const campaignId = parseInt(campaignIdBN);
                    const item = campaignId;
                    const campaignDetail = await contract.getCampaignDetails(item);
                    formattedCampaigns.push({ ...campaignDetail, key: item });
                }
                setCampaigns(formattedCampaigns);
                console.log("Campaign IDs:", formattedCampaigns);
            } catch (error) {
                console.error("Error fetching campaigns:", error);
            }
        }
    }, []);

    const handleCreateCampaign = () => {
        setCampaignModalOpen(true);
    };

    const createCampaign = async (name: string, description: string, contributionAmount: number) => {
        if (!name || !description || !contributionAmount) return;
        if (window.ethereum) {
            let accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            let userAddress = accounts[0];
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(userAddress);
            const contract = new Contract(contractAddress, abi, signer);
            let tx = await contract.createCampaign(name, description, contributionAmount);
            await tx.wait();
            getCampaigns();
            setCampaignModalOpen(false);
        }
    };

    const handleCampaignDetails = (selectedCampaign: Campaign) => {
        setCampaignDetailsModalOpen(true);
        setSelectedCampaign(selectedCampaign);
    };

    useEffect(() => {
        getCampaigns();
    }, [getCampaigns]);

    const contribute = async (address: string, contributionAmount: number) => {
        try {
            let accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            let userAddress = accounts[0];
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(userAddress);
            const contract = new Contract(contractAddress, abi, signer);

            let parsedAmount = parseEther(contributionAmount.toString());
            let tx = await contract.contribute(address, parsedAmount, { gasLimit: 500000 });
        } catch (error) {
            console.error("Error contributing to campaign:", error);
        }
    };
    const joinCampaign = async (id: number, tokenAddress: string, userName: string) => {
        try {
            let accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            let userAddress = accounts[0];
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(userAddress);
            const contract = new Contract(contractAddress, abi, signer);

            let tx = await contract.joinCampaign(id, tokenAddress, userName, { gasLimit: 500000 });
            await tx.wait();
            // You may want to update the list of campaigns after joining a campaign
            getCampaigns();
        } catch (error) {
            console.error("Error joining campaign:", error);
        }
    };

    return (
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <div className="mt-12">
                <div className="max-w-lg mt-4">
                    <h3 className="text-gray-600 text-xl font-bold sm:text-2xl ">
                        Available Campaigns
                    </h3>
                    <p className="text-gray-600 mt-2">
                        Welcome to your No. 1 Stablecoin Contribution Gateway!!!
                    </p>
                </div>
                <button
                    onClick={handleCreateCampaign}
                    className="py-2 px-3 my-4 font-medium text-white hover:text-white bg-black hover:bg-blue duration-150 hover:bg-gray-50 rounded-lg"
                >
                    Add Campaign
                </button>
                </div><div className="overflow-x-auto">
                <div className="overflow-x-hidden">
    <table className="w-full table-auto text-sm text-left">
        <thead className="bg-yellow-800 text-white">
            <tr>
                <th className="px-5 py-3 text-left text-xs font-medium">Campaign</th>
                <th className="px-5 py-3 text-left text-xs font-medium">Description</th>
                <th className="px-5 py-3 text-left text-xs font-medium">cUSD</th>
                <th className="px-5 py-3 text-left text-xs font-medium hidden sm:table-cell">Users</th>
                <th className="px-5 py-3 text-left text-xs font-medium hidden sm:table-cell">Total</th>
                <th className="px-5 py-3"></th>
            </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
            {/* Campaign rows */}
            {campaigns.map((selectedCampaign, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-100' : 'bg-white'}>
                    {/* Campaign data cells */}
                    <td className="px-5 py-4 whitespace-wrap">{selectedCampaign[0]}</td>
                    <td className="px-5 py-4 whitespace-wrap sm:max-w-[15rem] sm:whitespace-normal sm:line-clamp-3">{selectedCampaign[1]}</td>
                    <td className="px-5 py-4 whitespace-wrap">{selectedCampaign[2].toString()}</td>
                    <td className="px-5 py-4 whitespace-wrap hidden sm:table-cell">{selectedCampaign[6]}</td>
                    <td className="px-5 py-4 whitespace-wrap hidden sm:table-cell">{selectedCampaign[7].toString()}</td>
                    <td className="px-5 py-4 whitespace-wrap">
                        <button onClick={() => handleCampaignDetails(selectedCampaign)} className="text-yellow-600 hover:text-indigo-900">See Details</button>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
</div>

</div>

            {/* Campaign modal */}
            {campaignModalOpen && (
                <CampaignModal
                    onCreateCampaign={createCampaign}
                    onClose={() => setCampaignModalOpen(false)}
                    campaign={undefined}
                />
            )}
            {campaignDetailsModalOpen && selectedCampaign && (
                <CampaignDetailsModal
                    onClose={() => setCampaignDetailsModalOpen(false)}
                    onContribute={contribute}
                    onJoinCampaign={(id: number, tokenAddress: string, userName: string) => joinCampaign(id, tokenAddress, userName)}
                    campaign={selectedCampaign}
                />
            )}


        </div>
    );
};

export default Esusu;
