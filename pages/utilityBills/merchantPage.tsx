import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { contractAddress, abi } from '../../utils/pay';
import { BrowserProvider, Contract } from 'ethers';
import { ArrowLeftCircleIcon } from '@heroicons/react/24/outline';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddMerchant: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const router = useRouter();

  const handleAddMerchant = async () => {
    if (!name || !description || !address) return;

    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        const userAddress = accounts[0];

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner(userAddress);
        const contract = new Contract(contractAddress, abi, signer);

        const tx = await contract.addMerchant(name, description, address);
        await tx.wait();

        router.push('/merchants');
        toast.success("Merchant successfully added");
      } catch (error) {
        console.error('Error adding merchant:', error);
        toast.error("Failed to add merchant");

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
      <div className="flex flex-col overflow-scroll justify-between p-4 border rounded-lg shadow-md">

        <div className="m-4 text-sm">

          <h2 className="text-2xl font-bold mb-4">Add New Merchant</h2>
          <div className="mb-4">
          <h2 className="text-xs font-light">Input the name of merchant</h2>

            <input
              className="w-full p-2 border rounded"
              placeholder="Merchant Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="mb-4">
          <h2 className="text-xs font-light">Add description for this billing</h2>
            <input
              className="w-full p-2 border rounded"
              placeholder="Merchant Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="mb-4">
          <h2 className="text-xs font-light">all payment goes into this wallet please double check</h2>
            <input
              className="w-full p-2 border rounded"
              placeholder="Wallet Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <button
            onClick={()=>handleAddMerchant()}
            className="py-3 px-6 bg-prosperity text-black rounded-md w-full hover:bg-black hover:text-white transition duration-300"
          >
            Add Merchant
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMerchant;
