"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import CountrySelector from '@/components/utilityBills/CountrySelector';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useIdentitySDK } from "@goodsdks/react-hooks"
import { useFreebiesLogic } from '@/hooks/useFreebies';
import { useClaimProcessor } from "@/context/utilityProvider/ClaimContextProvider";
import Engagement from '@/components/Engagement';
import { ethers } from 'ethers';
import { toast } from 'sonner';

export default function Freebies() {
    const [claimMethod, setClaimMethod] = useState<'claim' | 'exchange'>('claim');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const {
        form,
        watchCountry,
        watchNetwork,
        isConnected,
        isProcessing,
        isClaiming,
        isLoading,
        networks,
        availablePlans,
        selectedPlan,
        canClaimToday,
        timeRemaining,
        setCountryCurrency,
        onSubmit,
        serviceType: hookServiceType,
        setServiceType: setHookServiceType,
    } = useFreebiesLogic();
    const { canClaim, handleClaim, entitlement, isWhitelisted, handleVerification, checkingWhitelist } = useClaimProcessor();
 
    return (
        <div className="container py-8 bg-gradient-to-br min-h-screen">

            {/* Mobile Data Section */}

            <div className="max-w-md mx-auto">
                <Card >
                    <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black rounded-t-lg">
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            💸 Claim G$ • 📱 Exchange for Data
                        </CardTitle>
                        <CardDescription className="text-black/90 dark:text-black/90">
                            🕐 Claim once every 24 hours
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 bg-white dark:bg-black p-6">
                        {!isMounted ? (
                            <div className="flex justify-center py-8 bg-yellow-50 dark:black/90 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <Loader2 className="h-8 w-8 animate-spin text-yellow-600 dark:text-yellow-400" />
                                <span className="ml-2 text-yellow-800 dark:text-black/90 font-semibold">Loading...</span>
                            </div>
                        ) : isProcessing ? (
                            <div className="flex justify-center py-8 bg-yellow-50 dark:black/90 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <Loader2 className="h-8 w-8 animate-spin text-yellow-600 dark:text-yellow-400" />
                                <span className="ml-2 text-yellow-800 dark:text-black/90 font-semibold">Processing...</span>
                            </div>
                        ) : !isConnected ? (
                            <div className="text-center py-4 bg-gradient-to-br from-yellow-300 to-yellow-400 ">
                                <p className="mb-4 text-black font-medium">
                                     Please connect your wallet to claim your free UBI from G$
                                </p>
                            </div>
                        ) : !isWhitelisted ? (
                                
                                <CardContent className="text-center space-y-3">
                                    {checkingWhitelist ? (
                                        <p className="text-slate-600">Checking verification status...</p>
                                    ) : isWhitelisted ? (
                                        <p className="text-green-600 font-medium">Your account is verified! ✓</p>
                                    ) : (
                                        <div className="space-y-3">
                                            <Button onClick={handleVerification} className="text-center py-4 bg-gradient-to-br from-yellow-300 to-yellow-400 text-black font-medium">
                                                Get Verified
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                        ) : (
                            <>
                                {/* Claim Method Selection */}
                                <div className="space-y-3">
                                    <label className="text-black/80 dark:text-white/60 font-light text-sm block">SELECT CLAIM TYPE</label>

                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all"
                                            style={{
                                                borderColor: claimMethod === 'claim' ? '#facc15' : '#e5e7eb',
                                                backgroundColor: claimMethod === 'claim' ? '#fffbeb' : 'transparent'
                                            }}
                                            onClick={() => setClaimMethod('claim')}
                                        >
                                            <input
                                                type="radio"
                                                id="claim"
                                                name="claimMethod"
                                                value="claim"
                                                checked={claimMethod === 'claim'}
                                                onChange={() => setClaimMethod('claim')}
                                                className="w-4 h-4 cursor-pointer"
                                            />
                                            <label htmlFor="claim" className="flex-1 cursor-pointer">
                                                <div className={`font-semibold text-sm ${claimMethod === 'claim' ? 'text-black/90' : 'text-black dark:text-white'}`}>1. Claim G$</div>
                                                <div className={`text-xs ${claimMethod === 'claim' ? 'text-black/80' : 'text-black/60 dark:text-white/60'}`}>Directly claim G$ tokens to your wallet</div>
                                            </label>
                                        </div>

                                        <div className="flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all"
                                            style={{
                                                borderColor: claimMethod === 'exchange' ? '#facc15' : '#e5e7eb',
                                                backgroundColor: claimMethod === 'exchange' ? '#fffbeb' : 'transparent'
                                            }}
                                            onClick={() => setClaimMethod('exchange')}
                                        >
                                            <input
                                                type="radio"
                                                id="exchange"
                                                name="claimMethod"
                                                value="exchange"
                                                checked={claimMethod === 'exchange'}
                                                onChange={() => setClaimMethod('exchange')}
                                                className="w-4 h-4 cursor-pointer"
                                            />
                                            <label htmlFor="exchange" className="flex-1 cursor-pointer">
                                                <div className={`font-semibold text-sm ${claimMethod === 'exchange' ? 'text-black/90' : 'text-black dark:text-white'}`}>2. Exchange G$ for data directly</div>
                                                <div className={`text-xs ${claimMethod === 'exchange' ? 'text-black/80' : 'text-black/60 dark:text-white/60'}`}>Exchange G$ for a data bundle sent to your phone</div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Form only shown when "Exchange G$ for data directly" is selected */}
                                {claimMethod === 'exchange' && (
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                                            {/* Service Type Selection */}


                                            <FormField
                                                control={form.control}
                                                name="country"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-black/80 dark:text-white/60 font-light text-sm">COUNTRY</FormLabel>
                                                        <div className="relative">
                                                            <FormControl>
                                                                <CountrySelector
                                                                    value={field.value}
                                                                    onChange={(val) => {
                                                                        field.onChange(val);
                                                                        if (val) setCountryCurrency(val);
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 dark:from-yellow-400/10 to-transparent pointer-events-none rounded-lg"></div>
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="space-y-2">
                                                <label className="text-black/80 dark:text-white/60 font-light text-sm block">SERVICE TYPE</label>
                                                <div className="flex gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setHookServiceType('data')}
                                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${hookServiceType === 'data'
                                                            ? 'border-yellow-400 bg-yellow-50 dark:black/90'
                                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                                                            }`}
                                                    >
                                                        <div className={`font-semibold text-sm ${hookServiceType === 'data' ? 'text-black/90' : 'text-black dark:text-white'}`}> Data</div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setHookServiceType('airtime')}
                                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${hookServiceType === 'airtime'
                                                            ? 'border-yellow-400 bg-yellow-50 dark:black/90'
                                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                                                            }`}
                                                    >
                                                        <div className={`font-semibold text-sm ${hookServiceType === 'airtime' ? 'text-black/90' : 'text-black dark:text-white'}`}> Airtime (₦100)</div>
                                                    </button>
                                                </div>
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="network"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-black/80 dark:text-white/60  font-light text-sm"> NETWORK PROVIDER</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !watchCountry || networks.length === 0}>
                                                            <FormControl>
                                                                <SelectTrigger className="bg-gray-100 dark:bg-white/10  text-gray-900 dark:text-white">
                                                                    <SelectValue placeholder="Select network provider" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent className="bg-white">
                                                                {networks.map((network) => (
                                                                    <SelectItem
                                                                        key={network.id}
                                                                        value={network.id}
                                                                    >
                                                                        {network.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {isLoading && watchCountry && (
                                                            <div className="text-sm text-black/50 dark:text-white/50  mt-1 flex items-center font-medium">
                                                                <Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading providers...
                                                            </div>
                                                        )}
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />

                                            <FormField
                                                control={form.control}
                                                name="plan"
                                                render={({ field }) => (
                                                    hookServiceType === 'data' ? (
                                                        <FormItem>
                                                            <FormLabel className="text-black/80 dark:text-white/60  font-light text-sm">DATA PLAN</FormLabel>
                                                            <Select
                                                                onValueChange={field.onChange}
                                                                value={field.value}
                                                                disabled={isLoading || !watchNetwork || !availablePlans || availablePlans.length === 0}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger className="bg-gray-100 dark:bg-white/10  text-black/90 dark:text-white/90">
                                                                        <SelectValue placeholder="Select data plan" className='text-xs' />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent className="bg-white">
                                                                    {availablePlans && availablePlans.map((plan) => (
                                                                        <SelectItem
                                                                            key={plan.id}
                                                                            value={plan.id}
                                                                        >
                                                                            {plan.name} - {plan.price}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {isLoading && (
                                                                <div className="text-sm text-black/50 dark:text-white/50  mt-1 flex items-center font-medium">
                                                                    <Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading plans...
                                                                </div>
                                                            )}
                                                            <FormMessage />
                                                        </FormItem>
                                                    ) : <></>
                                                )} />
                                            <FormField
                                                control={form.control}
                                                name="phoneNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-black/80 dark:text-white/60  font-light text-sm">PHONE NUMBER</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Enter phone number"
                                                                {...field}
                                                                className="text-xs bg-gray-100 dark:bg-white/10  text-black-900 dark:text-white/90" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            <FormField
                                                control={form.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-black/80 dark:text-white/60  font-light text-sm">EMAIL</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Enter your email"
                                                                {...field}
                                                                className="text-xs" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                        </form>
                                    </Form>
                                )}</>
                        )}
                    </CardContent>

                    <CardFooter className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-b-lg">
                        <Button
                            className="w-full bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-yellow-400 dark:text-black font-bold text-lg py-6 border-2 border-black/90 dark:border-black shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                            disabled={
                                !canClaimToday ||
                                (claimMethod === 'claim'
                                    ? (!canClaim || isClaiming || isProcessing)
                                    : (
                                        !canClaim ||
                                        isClaiming ||
                                        isProcessing ||
                                        // only require a selected plan when service type is data
                                        (hookServiceType === 'data' && !selectedPlan) ||
                                        !form.watch("phoneNumber") ||
                                        form.watch("phoneNumber").length < 10
                                    ))
                            }
                            onClick={() => {
                                if (claimMethod === 'claim') {
                                    handleClaim();
                                } else {
                                    form.handleSubmit(onSubmit)();
                                }
                            }}
                        >
                            {!canClaimToday ? (
                                timeRemaining ? `⏰ Next claim in ${timeRemaining}` : '⏰ Already claimed today'
                            ) : isClaiming || isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Claiming...
                                </>
                            ) : claimMethod === 'claim' ? (
                                (() => {
                                    const raw = ethers.formatUnits(entitlement ?? '0');
                                    const formatted = Number(raw).toFixed(2);
                                    return `Claim ${formatted && formatted !== '0.00' ? `${formatted} G$` : 'G$'} Now`;
                                })()
                            ) : (
                                hookServiceType === 'airtime' ? 'Exchange for Airtime' : 'Exchange for Data Bundle'
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* GoodDollar Rewards Section */}
            <>
                <Engagement />
            </>
        </div>
    );
}