"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useThrift } from '@/context/thrift/ThriftContext';
import { PlusIcon } from 'lucide-react';
import { TOKENS, getSupportedThriftTokens, getTokenBySymbol, type TokenConfig } from '@/utils/tokens';

interface CreateCampaignDialogProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function CreateCampaignDialog({ isOpen, onOpenChange, hideTrigger }: CreateCampaignDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = isOpen !== undefined && onOpenChange !== undefined;
  const open = isControlled ? isOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [maxMembers, setMaxMembers] = useState('5');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedToken, setSelectedToken] = useState<string>('USDC');
  const [startDate, setStartDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [creatorName, setCreatorName] = useState<string>(''); // Creator's name
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');


  const { createThriftGroup, loading, error, isConnected } = useThrift();



  const handleSubmit = async () => {
    if (!name || !description || !contributionAmount || !maxMembers || !selectedToken || !startDate) return;

    try {
      const tokenConfig = getTokenBySymbol(selectedToken);
      if (!tokenConfig) {
        throw new Error('Invalid token selected');
      }

      let startDateTime = new Date(startDate);
      if (startDateTime.getTime() <= Date.now()) {
        // If the selected date (midnight) is in the past (i.e., it's "Today"),
        // set start time to 5 minutes in the future to pass the contract check.
        startDateTime = new Date(Date.now() + 5 * 60 * 1000);
      }

      await createThriftGroup(
        name,
        description,
        contributionAmount,
        parseInt(maxMembers),
        isPublic,
        tokenConfig.address,
        startDateTime,
        creatorName || undefined, // Pass creator name
      );
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
    setSelectedToken('USDC');
    const today = new Date();
    setStartDate(today.toISOString().split('T')[0]);
    setCreatorName('');
    setEmail('');
    setPhone('');
  };


  return (
    <>
      {!hideTrigger && (
        <Button
          onClick={() => setOpen(true)}
          className="w-full mb-6 rounded-lg bg-white text-black dark:bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
          variant="outline"
        >
          <PlusIcon className="mr-2 h-4 w-4" /> Create Thrift Group
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] dark:text-white dark:bg-black dark:border-neutral-800 rounded-lg">
          <DialogHeader>
            <DialogTitle>Create New Thrift Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid gap-6">
              {!isConnected ? (
                <div className="text-center">
                  <p className="mb-4">Connect your wallet to create a thrift group</p>
                  <Button className='rounded-full dark:bg-primary'> Please Connect Wallet</Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right dark:text-neutral-200">Group Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="col-span-3 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-500"
                      placeholder="My Thrift Group"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="creatorName" className="text-right dark:text-neutral-200">Your Name</Label>
                    <Input
                      id="creatorName"
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      className="col-span-3 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-500"
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right dark:text-neutral-200">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="col-span-3 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-500"
                      placeholder="name@example.com"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone" className="text-right dark:text-neutral-200">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="col-span-3 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-500"
                      placeholder="+1234567890"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right dark:text-neutral-200">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="col-span-3 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-500"
                      placeholder="A brief description of your thrift group"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="token" className="text-right dark:text-neutral-200">
                      Token
                    </Label>
                    <Select value={selectedToken} onValueChange={setSelectedToken}>
                      <SelectTrigger className="col-span-3 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white">
                        <SelectValue placeholder="Select a token" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSupportedThriftTokens().map((token) => (
                          <SelectItem key={token.symbol} value={token.symbol}>
                            <div className="flex items-center gap-2">
                              {token.logoUrl && (
                                <img src={token.logoUrl} alt={token.name} className="w-4 h-4" />
                              )}
                              <span>{token.symbol} - {token.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right dark:text-neutral-200">
                      Contribution Amount
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      className="col-span-3 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-500"
                      placeholder="100"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="startDate" className="text-right dark:text-neutral-200">
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="col-span-3 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="maxMembers" className="text-right dark:text-neutral-200">
                      Max Members
                    </Label>
                    <Input
                      id="maxMembers"
                      type="number"
                      min="2"
                      max="10"
                      value={maxMembers}
                      onChange={(e) => setMaxMembers(e.target.value)}
                      className="col-span-3 dark:bg-neutral-900 dark:border-neutral-800 dark:text-white dark:placeholder:text-neutral-500"
                      placeholder="5"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isPublic" className="text-right dark:text-neutral-200">
                      Group Type
                    </Label>
                    <div className="col-span-3">
                      <RadioGroup
                        value={isPublic ? "public" : "private"}
                        onValueChange={(value) => setIsPublic(value === "public")}
                        className="flex items-center gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="public" id="public" />
                          <Label htmlFor="public">Public</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="private" id="private" />
                          <Label htmlFor="private">Private</Label>
                        </div>
                      </RadioGroup>
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
              className="mb-2 rounded-lg"
              disabled={loading || !isConnected || !name || !description || !contributionAmount || !maxMembers || !selectedToken || !startDate || !creatorName || !email || !phone}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}