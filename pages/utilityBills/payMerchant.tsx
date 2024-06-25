import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { BrowserProvider, Contract, parseEther } from "ethers";
import { ArrowLeftCircleIcon } from '@heroicons/react/24/outline';
import { abi, contractAddress } from '@/utils/pay';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PayMerchant: React.FC = () => {
    const router = useRouter();
    const { merchant } = router.query;
    const merchantData = merchant ? JSON.parse(merchant as string) : [];

    const [amount, setAmount] = useState<number | string>('');
    const [merchantDetails, setMerchantDetails] = useState<any>([]);
    const [transactionStatus, setTransactionStatus] = useState<string>('');
    const [address] = useState(merchantData[3]);

    useEffect(() => {
        if (merchant) {
            setMerchantDetails(JSON.parse(merchant as string));
        }
    }, [merchant]);

    const handleSendPayment = async () => {
        if (!amount || !address) {
            console.error('Amount or address is missing');
            return;
        }
        if (window.ethereum) {
            try {
                setTransactionStatus('Processing...');
                const accounts = await window.ethereum.request({
                    method: "eth_requestAccounts",
                });
                const userAddress = accounts[0];

                const provider = new BrowserProvider(window.ethereum);
                const signer = await provider.getSigner(userAddress);
                const contract = new Contract(contractAddress, abi, signer);

                const deposit = parseEther(amount.toString());
                const tx = await contract.send(address, deposit, { gasLimit: 500000 });
                await tx.wait();

                setTransactionStatus('Payment Successful');
                setTimeout(() => router.push('/utilityBills'), 3000);
                toast.success("Payment sent successfully");
            } catch (error) {
                console.error("Error sending payment:", error);
                setTransactionStatus('Payment Failed');
                toast.error("Payment failed");

            }
        }
    };

    const handleReturnHome = () => {
        router.push('/utilityBills');
    };

    return (
        <div className="max-w-screen-md mx-auto p-4">
            <ToastContainer />
            <div className='flex justify-start mb-4'>
                <ArrowLeftCircleIcon
                    onClick={handleReturnHome}
                    className="h-8 w-8 text-black hover:text-gray-700 cursor-pointer"
                />
            </div>
            <div className="p-2 mb-4 text-xl">
                <h3 className="flex justify-center  mb-2">{merchantDetails[1]}</h3>
            </div>
            {merchantDetails && (
                <div className="flex flex-col overflow-scroll justify-between mb-8 p-4 border rounded-lg shadow-md">

                    <div className="mb-4 text-sm">

                        <p className="text-gray-700 mb-2">{merchantDetails[2]}</p>
                    </div>
                    <div className="mb-4 text-sm ">
                        <p className="text-gray-700">Address: {merchantDetails[3]}</p>
                    </div>
                      </div>
            )}
            <form className="mb-4 text-sm">
                <div className="mb-4">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">Amount to Pay</label>
                    <input
                        id="amount"
                        className="w-full p-2 border border-gray-300 rounded"
                        type="number"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>

                <div className="mb-4 text-sm">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full names</label>
                    <input
                        id="name"
                        className="w-full p-2 border border-gray-300 rounded"
                        type="text"
                        placeholder="Full Name"
                    />
                </div>
            </form>
            <button
                onClick={()=>handleSendPayment()}
                className="py-3 px-6 bg-prosperity text-black rounded-md w-full hover:bg-black hover:text-white transition duration-300"
            >
                {transactionStatus === 'Processing...' ? 'Processing...' : 'Pay Now'}
            </button>
        </div>
    );
};

export default PayMerchant;
