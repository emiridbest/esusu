import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeftCircleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { contractAddress, abi } from '@/utils/esusu';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import { Campaign } from './index';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CampaignDetailsPage: React.FC = () => {
    const router = useRouter();
    const { id } = router.query;
    const [campaignData, setCampaignData] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const fetchCampaignDetails = useCallback(async (campaignId: string) => {
        if (window.ethereum) {
            try {
                const provider = new BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const contract = new Contract(contractAddress, abi, signer);

                const campaignDetail = await contract.getCampaignDetails(parseInt(campaignId));
                setCampaignData({
                    ...campaignDetail,
                    id: parseInt(campaignId),
                    key: parseInt(campaignId),
                });
                setLoading(false);
            } catch (error) {
                console.error("Error fetching campaign details:", error);
                setError('Failed to load campaign details. Please try again.');
                setLoading(false);
            }
        } else {
            setError('Ethereum wallet is not connected. Please connect your wallet.');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (id) {
            fetchCampaignDetails(id as string);
        }
    }, [id, fetchCampaignDetails]);

    const handleContribute = async (campaignData: any, campaignId: string) => {
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            const userAddress = accounts[0];
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(userAddress);
            const contract = new Contract(contractAddress, abi, signer);
            const tokenAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
          const tx =  await contract.contribute(tokenAddress, parseFloat(campaignData[2].toString()), { gasLimit: 500000 });
            await tx.wait();
            fetchCampaignDetails(campaignId);
            toast.success("Contribution sent succesfully");
        } catch (error) {
            console.error("Error contributing to campaign:", error);
            toast.error("Contribution failed");

        }
    };

    const handleJoin = async (campaignId: string, userName: string) => {
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            const userAddress = accounts[0];
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(userAddress);
            const contract = new Contract(contractAddress, abi, signer);
            const tokenAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
            const tx = await contract.joinCampaign(parseInt(campaignId), tokenAddress, userName, { gasLimit: 500000 });
            await tx.wait();
            fetchCampaignDetails(campaignId);
            toast.success("Succesfully joined a campaign");
        } catch (error) {
            console.error("Error joining campaign:", error);
            toast.error("Failed to join a campaign");

        }
    };


    const handleReturnHome = () => {
        router.push('/thrift');
    };

    if (loading) {
        return <p>Loading campaign details...</p>;
    }

    if (error) {
        return <p className="text-red-600">{error}</p>;
    }

    if (!campaignData) {
        return <p>No campaign details available.</p>;
    }

    return (
        <div className="container mx-auto p-4 lg:p-0">
            <ToastContainer />
            <div className="flex flex-1 flex-col  text-sm ">

                <div className='flex justify-start'>
                    <ArrowLeftCircleIcon
                        onClick={handleReturnHome}
                        className="h-6 cursor-pointer"
                    />
                </div>
                <>
                    <div className="flex flex-col items-center  text-lg font-bold ">
                        <h3 className="text-black sm:text-2xl">
                            <p className="flex justify-center font-bold">{campaignData[0]}</p>
                            <p className="flex justify-center text-sm">{campaignData[1]}</p>

                        </h3>
                    </div>
                </>
                <div className="flex flex-col md:flex-row mt-6 gap-6">
                    <div className="flex-1 p-4 rounded-lg shadow-md text-sm ">
                        <div className="flex flex-col gap-4">
                            <p className="flex justify-between"><span>Contribution Amount:</span> {campaignData[2].toString()}</p>
                            <p className="flex justify-between"><span>Total Contributions: </span>{campaignData[5].toString()}</p>
                            <p className="flex justify-between"><span>Payout Interval:</span> {campaignData[3].toString()}</p>
                            <p className="flex justify-between"><span>Last Payout Block:</span> {campaignData[4].toString()}</p>
                            <p className="flex justify-between"><span>Members: </span>{campaignData[6]}</p>
                            <div className="mt-4">
                                <p className='text-sm font-light text-gray-500'> Add your name to join this contribution</p>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="Your Name"
                                    className="w-full mt-3 py-3 px-4 bg-gray-100 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                                />
                                <button
                                    onClick={()=>handleJoin(campaignData[7], userName)}
                                    className="w-full mt-3 py-3 px-4 font-medium text-sm text-center bg-prosperity text-black hover:bg-black hover:text-white  rounded-lg ring-offset-2 ring-indigo-600 focus:ring-2"
                                >
                                    Join Campaign
                                </button>
                                <button
                                    onClick={()=>handleContribute(campaignData[7], campaignData[7])}
                                    className="w-full mt-3 py-3 px-4 font-medium text-sm text-center bg-prosperity text-black hover:bg-black  hover:text-white rounded-lg ring-offset-2 ring-indigo-600 focus:ring-2"
                                >
                                    Contribute
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default CampaignDetailsPage;
