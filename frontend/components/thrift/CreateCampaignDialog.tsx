"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useThrift } from '@/context/thrift/ThriftContext';
import { PlusIcon } from 'lucide-react';

export function CreateCampaignDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [maxMembers, setMaxMembers] = useState('5');
  const [isPublic, setIsPublic] = useState(true);
  const [connected, setConnected] = useState(false);
  
  const { createThriftGroup, loading, error } = useThrift();

  // Check if wallet is connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          setConnected(accounts && accounts.length > 0);
        } catch (error) {
          console.error("Error checking connection:", error);
          setConnected(false);
        }
      } else {
        setConnected(false);
      }
    };

    checkConnection();
    
    // Setup listeners for connection changes
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        setConnected(accounts.length > 0);
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);
  
  const handleSubmit = async () => {
    if (!name || !description || !contributionAmount || !maxMembers) return;
    
    try {
      await createThriftGroup(name, description, contributionAmount, parseInt(maxMembers), isPublic);
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create thrift group:', error);
    }
  };
  
  const resetForm = () => {
    setName('');
    setDescription('');
    setContributionAmount('');
    setMaxMembers('5');
    setIsPublic(true);
  };
  

  return (
    <>
      <Button 
        onClick={() => setOpen(true)} 
        className="w-full mb-6 rounded-full bg-white text-black dark:bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
        variant="outline"
      >
        <PlusIcon className="mr-2 h-4 w-4" /> Create Thrift Group
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] dark:text-white rounded-lg">
          <DialogHeader>
            <DialogTitle>Create New Thrift Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid gap-6">
              {!connected ? (
                <div className="text-center">
                  <p className="mb-4">Connect your wallet to create a thrift group</p>
                  <Button className='rounded-full dark:bg-primary'> Please Connect Wallet</Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="col-span-3"
                      placeholder="My Thrift Group"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="col-span-3"
                      placeholder="A brief description of your thrift group"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">
                      Deposit Amount (cUSD)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      className="col-span-3"
                      placeholder="100"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="maxMembers" className="text-right">
                      Max Members
                    </Label>
                    <Input
                      id="maxMembers"
                      type="number"
                      min="2"
                      max="10"
                      value={maxMembers}
                      onChange={(e) => setMaxMembers(e.target.value)}
                      className="col-span-3"
                      placeholder="5"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isPublic" className="text-right">
                      Group Type
                    </Label>
                    <div className="col-span-3 flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="groupType"
                          checked={isPublic}
                          onChange={() => setIsPublic(true)}
                          className="text-primary"
                        />
                        <span>Public</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="groupType"
                          checked={!isPublic}
                          onChange={() => setIsPublic(false)}
                          className="text-primary"
                        />
                        <span>Private</span>
                      </label>
                    </div>
                  </div>
                  
                  {error && (
                    <div className="col-span-4 text-red-500 text-sm">
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => {
              setOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
               className="mb-2 rounded-full"
              disabled={loading || !connected || !name || !description || !contributionAmount || !maxMembers}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}