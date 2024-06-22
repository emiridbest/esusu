import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { contractAddress, abi } from '../../utils/pay';
import { BrowserProvider, Contract } from "ethers";

const ModifyMerchant: React.FC = () => {
    const router = useRouter();
    const { merchant } = router.query;
    const merchantData = merchant ? JSON.parse(merchant as string) : null;

    const [name, setName] = useState(merchantData?.name || "");
    const [description, setDescription] = useState(merchantData?.description || "");
    const [address, setAddress] = useState(merchantData?.address || "");

    useEffect(() => {
        if (merchantData) {
            setName(merchantData.name);
            setDescription(merchantData.description);
            setAddress(merchantData.address);
        }
    }, [merchantData]);

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

    return (
        <div className="max-w-screen-md mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Modify Merchant</h2>
            <div className="mb-4">
                <input
                    className="w-full p-2 border rounded"
                    placeholder="Merchant Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div className="mb-4">
                <input
                    className="w-full p-2 border rounded"
                    placeholder="Merchant Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>
            <div className="mb-4">
                <input
                    className="w-full p-2 border rounded"
                    placeholder="Wallet Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                />
            </div>
            <button
                onClick={handleModifyMerchant}
                className="py-2 px-4 bg-black text-white rounded"
            >
                Save Changes
            </button>
        </div>
    );
};

export default ModifyMerchant;
