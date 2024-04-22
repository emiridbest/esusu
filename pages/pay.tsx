import React, { useState, useCallback, useEffect } from 'react';
import { contractAddress, abi } from '../utils/pay';
import { BrowserProvider, Contract, parseEther} from "ethers";
import PaymentModal from '../utils/modal';
import MerchantModal from '../utils/merchant';

interface Merchant {
    [x: string]: any;
    id: number;
    name: string;
    address: string;
    description: string;
}


const Merchant: React.FC = () => {
    const [merchants, setMerchants] = useState<Merchant[]>([]);
    const [modal, setModal] = useState(false);
    const [merchantModal, setMerchantModal] = useState(false);
    const [selectedMerchant, setSelectedMerchant] = useState<Merchant[3]>("");
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);

    const getMerchants = useCallback(async () => {
        if (window.ethereum) {
            try {
                let accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
                let userAddress = accounts[0];

                const provider = new BrowserProvider(window.ethereum);
                const signer = await provider.getSigner(userAddress);
                const contract = new Contract(contractAddress, abi, signer);

                let merchantIds = await contract.allMerchant();
                const formattedMerchants: Merchant[] = [];
                for (const merchantIdBN of merchantIds) {
                    const merchantId = parseInt(merchantIdBN);
                    const item = merchantId - 1;
                    const merchantDetail = await contract.getMerchantInfo(item);
                    formattedMerchants.push({ ...merchantDetail, key: item });
                }
                setMerchants(formattedMerchants);
                console.log("Merchant IDs:", formattedMerchants);
            } catch (error) {
                console.error("Error fetching merchants:", error);
            }
        }
    }, []);


    const addMerchant = async (name: string, description: string, address: string) => {
        if (!name || !description || !address) return;
        if (window.ethereum) {
            let accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            let userAddress = accounts[0];
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(userAddress);
            const contract = new Contract(contractAddress, abi, signer);
            console.log(name)
            console.log(description)
            console.log(address)

            let tx = await contract.addMerchant(name, description, address);
            await tx.wait();

            getMerchants();
            setMerchantModal(false);

        }
    };
  
    const handlePay = (merchant: Merchant) => {
        setSelectedMerchant(merchant);
        setPaymentModalOpen(true);
    };


    const handleModify = (merchant: Merchant) => {
        setSelectedMerchant(merchant);
        setMerchantModal(true);
    };
    useEffect(() => {
        getMerchants();
    }, [getMerchants]);

    const handleSendPayment = async (merchantAddress: Merchant["address"], amount: number) => {
        if (window.ethereum) {
            let accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            let userAddress = accounts[0];
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(userAddress);
            const contract = new Contract(contractAddress, abi, signer);
            console.log(merchantAddress);
            console.log(amount);
            let deposit = parseEther(amount.toString());
            let tx = await contract.send(merchantAddress, deposit, { gasLimit: 500000 });
            await tx.wait();
        }
    };

    const handleModifyMerchant = async (newName: string, newDescription: string, newAddress: string) => {
        if (!newName || !newDescription || !newAddress || !selectedMerchant) return;

        if (window.ethereum) {
            let accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            let userAddress = accounts[0];
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner(userAddress);
            const contract = new Contract(contractAddress, abi, signer);

            let tx = await contract.updateMerchant(selectedMerchant.key, newName, newDescription, newAddress);
            await tx.wait();
            getMerchants();
        }
    };

    return (
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <div className="max-w-lg">
                <h3 className="text-gray-800 text-xl font-bold sm:text-2xl">
                    Available Merchants
                </h3>
                <p className="text-gray-600 mt-2">
                    Welcome to your No. 1 Stable coin payment gateway!!!
                </p>
            </div>
            <div className="mt-4">
                <button
                    onClick={() => setMerchantModal(true)}
                    className="py-2 px-3 font-medium text-white hover:text-white bg-black hover:bg-blue duration-150 hover:bg-gray-50 rounded-lg"
                >
                    Add Merchant
                </button>
            </div>
            <div className="mt-12">
                <table className="w-full table-auto text-sm text-left overflow-x-scroll">
                    <thead className="bg-black text-white font-medium border-b">
                        <tr>
                            <th className="py-3 px-3 sm:px-6">Product Name</th>
                            <th className="py-3 px-3 sm:px-6">Description</th>
                            <th className="hidden">Address</th>
                            <th className="py-3 px-3 sm:px-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {merchants && merchants.map((selectedMerchant, item) => (
                            <tr key={item}>
                                <td className="px-3 py-2 sm:px-6 sm:py-4">{selectedMerchant[1]}</td>
                                <td className="px-3 py-2 sm:px-6 sm:py-4">{selectedMerchant[2]}</td>
                                <td className="hidden">{selectedMerchant[3]}</td>
                                <td className="px-3 py-2 sm:px-1 sm:py-4">
                                    <button
                                        onClick={() => handlePay(selectedMerchant)}
                                        className="py-2 px-3 font-medium text-yellow-800 hover:text-indigo-500 duration-150 hover:bg-gray-50 rounded-lg mb-2 sm:mb-0"
                                    >
                                        Pay
                                    </button>
                                    <button
                                        onClick={() => handleModify(selectedMerchant)}
                                        className="py-2 leading-none px-3 font-medium text-red-600 hover:text-red-500 duration-150 hover:bg-gray-50 rounded-lg"
                                    >
                                        Modify
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

            </div>


            {paymentModalOpen && (
                <PaymentModal
                    onSendPayment={handleSendPayment}
                    onClose={() => setPaymentModalOpen(false)}
                    merchant={selectedMerchant}
                />
            )}



            {/* Modal for Modify */}
            {merchantModal && (
                <MerchantModal
                    onAddMerchant={addMerchant}
                    onModifyMerchant={handleModifyMerchant}
                    onClose={() => {
                        setMerchantModal(false);
                        setSelectedMerchant("");
                    }}
                    merchant={selectedMerchant}
                />
            )}
        </div>
    );
};

export default Merchant;