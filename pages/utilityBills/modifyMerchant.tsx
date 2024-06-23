import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { contractAddress, abi } from '../../utils/pay';
import { BrowserProvider, Contract } from "ethers";
import { ArrowLeftCircleIcon } from '@heroicons/react/24/outline';

const ModifyMerchant: React.FC = () => {
    const router = useRouter();
    const { merchant } = router.query;
    const merchantData = merchant ? JSON.parse(merchant as string) : [];

    const [name, setName] = useState(merchantData[1]);
    const [description, setDescription] = useState(merchantData[2]);
    const [address, setAddress] = useState(merchantData[3]);


    const handleModifyMerchant = async () => {
        if (!name || !description || !address) return;
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
                const userAddress = accounts[0];

                const provider = new BrowserProvider(window.ethereum);
                const signer = await provider.getSigner(userAddress);
                const contract = new Contract(contractAddress, abi, signer);

                const tx = await contract.updateMerchant(merchantData.key, name, description, address);
                await tx.wait();

                router.push('/merchants');
            } catch (error) {
                console.error("Error modifying merchant:", error);
            }
        }
    };
    const handleReturnHome = () => {
        router.push('/utilityBills');
    };

    return (
        <div className="max-w-screen-md mx-auto p-4">

            <div className='flex justify-start mb-4'>
                <ArrowLeftCircleIcon
                    onClick={handleReturnHome}
                    className="h-8 w-8 text-black hover:text-gray-700 cursor-pointer"
                />
            </div>
            <div className="flex flex-col overflow-scroll justify-between p-4 border rounded-lg shadow-md">

                <div className="m-4 text-sm">

                    <h2 className="text-2xl font-bold mb-4">Modify Merchant</h2>
                    <div className="mb-4">
                        <h2 className="text-xs font-light">Modify name of merchant</h2>

                        <input
                            className="w-full p-2 border rounded"
                            placeholder="Merchant Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="mb-4">
                        <h2 className="text-xs font-light">Modify description of utility</h2>
                        <input
                            className="w-full p-2 border rounded"
                            placeholder="Merchant Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="mb-4">
                        <h2 className="text-xs font-light">Modify wallet address of merchant</h2>
                        <input
                            className="w-full p-2 border rounded"
                            placeholder="Wallet Address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={()=>handleModifyMerchant()}
                        className="py-3 px-6 bg-black text-white rounded-md w-full hover:bg-prosperity hover:text-black transition duration-300"
                        >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModifyMerchant;
