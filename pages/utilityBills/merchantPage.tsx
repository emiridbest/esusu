import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { contractAddress, abi } from '../../utils/pay';
import { BrowserProvider, Contract } from 'ethers';

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
      } catch (error) {
        console.error('Error adding merchant:', error);
      }
    }
  };

  return (
    <div className="max-w-screen-md mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Add New Merchant</h2>
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
        onClick={handleAddMerchant}
        className="py-2 px-4 bg-black text-white rounded"
      >
        Add Merchant
      </button>
    </div>
  );
};

export default AddMerchant;
