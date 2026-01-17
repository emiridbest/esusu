"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { MiniSafeAave, contractAddress, abi } from '../../utils/abi';

const hardcodedAdmin = "0x5b2e388403b60972777873e359a5D04a832836b3".toLowerCase();

const AdminPanel: React.FC = () => {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signer, setSigner] = useState<any>(null);
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [ownerAddress, setOwnerAddress] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    async function checkOwner() {
      setLoading(true);
      setError(null);
      try {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          setIsOwner(false);
          setLoading(false);
          return;
        }
        const provider = new ethers.BrowserProvider(ethereum);
        const signerObj = await provider.getSigner();
        setSigner(signerObj);
        const address = await signerObj.getAddress();
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const owner = await contract.owner();
        setOwnerAddress(owner);
        const isAdminAddress = address && (
          address.toLowerCase() === owner.toLowerCase() || address.toLowerCase() === hardcodedAdmin
        );
        if (mounted) setIsOwner(isAdminAddress);
      } catch (err: any) {
        setError('Failed to check owner.');
        setIsOwner(false);
      } finally {
        setLoading(false);
      }
    }
    checkOwner();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (isOwner === false && !loading) {
      setTimeout(() => router.push('/'), 2000);
    }
    if (isOwner === true && !signer) {
      setFadeOut(true);
      setTimeout(() => router.push('/'), 800);
    }
  }, [isOwner, signer, loading, router]);

  // Contract actions
  const contract = signer ? new MiniSafeAave(contractAddress, signer) : null;
  async function handleAction(fn: () => Promise<any>) {
    setError(null);
    try {
      await fn();
      alert('Transaction sent!');
    } catch (err: any) {
      setError(err?.message || 'Transaction failed');
    }
  }

  // Get Supported Tokens
  async function fetchSupportedTokens() {
    setError(null);
    try {
      if (!contract) return;
      const tokens = await contract.getSupportedTokens();
      setSupportedTokens(tokens);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch supported tokens');
    }
  }

  // Get Owner (refresh)
  async function fetchOwnerAddress() {
    setError(null);
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return;
      const provider = new ethers.BrowserProvider(ethereum);
      const contractInstance = new ethers.Contract(contractAddress, abi, provider);
      const owner = await contractInstance.owner();
      setOwnerAddress(owner);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch owner address');
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mr-3"></span>
      <span className="text-lg text-primary">Checking owner...</span>
    </div>
  );
  if (isOwner === false && !loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 text-center max-w-sm">
          <h2 className="text-xl font-bold text-primary mb-2">Access Denied</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">You are not authorized to view the admin panel.</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-opacity duration-700 ${fadeOut ? 'opacity-0' : 'opacity-100'} p-8 max-w-xl mx-auto bg-white dark:bg-black rounded-xl shadow-lg mt-12 border border-gray-200 dark:border-gray-800`}>
      <h2 className="text-2xl font-bold mb-6 text-primary">Admin Contract Controls</h2>
      {error && <div className="text-red-500 mb-4 font-semibold">{error}</div>}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Owner Address:</span>
          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{ownerAddress}</span>
          <button className="ml-2 text-primary underline text-xs" onClick={fetchOwnerAddress}>Refresh</button>
        </div>
        <div className="mt-4">
          <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-primary/90 transition-all duration-200" onClick={fetchSupportedTokens}>Get Supported Tokens</button>
          {supportedTokens.length > 0 && (
            <div className="mt-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Supported Tokens:</span>
              <ul className="list-disc ml-6 text-xs">
                {supportedTokens.map((token, idx) => (
                  <li key={idx} className="break-all">{token}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="grid gap-4">
        <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-primary/90 transition-all duration-200" onClick={() => handleAction(() => contract?.pause())}>Pause Contract</button>
        <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-primary/90 transition-all duration-200" onClick={() => handleAction(() => contract?.unpause())}>Unpause Contract</button>
        <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-primary/90 transition-all duration-200" onClick={() => handleAction(() => contract?.initiateEmergencyWithdrawal())}>Initiate Emergency Withdrawal</button>
        <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-primary/90 transition-all duration-200" onClick={() => handleAction(() => contract?.cancelEmergencyWithdrawal())}>Cancel Emergency Withdrawal</button>
        <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-primary/90 transition-all duration-200" onClick={() => handleAction(() => contract?.resumeOperations())}>Resume Operations</button>
        <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-primary/90 transition-all duration-200" onClick={() => handleAction(() => contract?.triggerCircuitBreaker('Manual admin trigger'))}>Trigger Circuit Breaker</button>
        <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-primary/90 transition-all duration-200" onClick={() => handleAction(() => contract?.updateCircuitBreakerThresholds(1000, 3600))}>Update Circuit Breaker Thresholds</button>
        <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-primary/90 transition-all duration-200" onClick={() => {
          const token = prompt('Enter token address to add:');
          if (token) handleAction(() => contract?.addSupportedToken(token));
        }}>Add Supported Token</button>
        <button className="bg-primary text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-primary/90 transition-all duration-200" onClick={() => {
          const token = prompt('Token address for emergency withdrawal:');
          if (token) handleAction(() => contract?.executeEmergencyWithdrawal(token));
        }}>Execute Emergency Withdrawal</button>
      </div>
    </div>
  );
};

export default AdminPanel;
