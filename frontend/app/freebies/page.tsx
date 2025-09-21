"use client";

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
import ClaimStatusDisplay from '@/components/freebies/ClaimStatusDisplay';
import { useFreebiesLogic } from '@/hooks/useFreebies';
import { useClaimProcessor } from "@/context/utilityProvider/ClaimContextProvider";
import Engagement from '@/components/Engagement';

export default function Freebies() {
    const {
        form,
        watchCountry,
        watchNetwork,
        isConnected,
        isProcessing,
        isClaiming,
        isLoading,
        isWhitelisted,
        loadingWhitelist,
        timeRemaining,
        networks,
        availablePlans,
        selectedPlan,
        setCountryCurrency,
        onSubmit
    } = useFreebiesLogic();
    const { canClaim } = useClaimProcessor();

    return (
        <div className="container py-8 bg-gradient-to-br from-yellow-50 to-white dark:from-black/90 dark:to-black min-h-screen">
            <p className="text-center mb-8 text-xl font-semibold text-black dark:text-yellow-100 bg-yellow-200 dark:bg-yellow-900/30 py-3 px-6 rounded-full mx-auto max-w-2xl shadow-lg">
                Claim FREE mobile data bundles  (UBI) and Earn loyalty rewards with GoodDollar tokens
            </p>


            {/* Mobile Data Section */}

            <div className="max-w-md mx-auto">
                <Card className="bg-white dark:bg-black border-2 border-yellow-400 dark:border-yellow-500 shadow-2xl shadow-yellow-500/20 dark:shadow-yellow-500/30">
                    <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-500 dark:from-yellow-600 dark:to-yellow-700 text-black dark:text-white rounded-t-lg">
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            📱 Free Data Bundle
                        </CardTitle>
                        <CardDescription className="text-black/80 dark:text-yellow-100 font-medium">
                            🕐 Claim once every 24 hours
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 bg-white dark:bg-black p-6">
                        {isProcessing ? (
                            <div className="flex justify-center py-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <Loader2 className="h-8 w-8 animate-spin text-yellow-600 dark:text-yellow-400" />
                                <span className="ml-2 text-yellow-800 dark:text-yellow-300 font-semibold">Processing...</span>
                            </div>
                        ) : !isConnected ? (
                            <div className="text-center py-4 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-black rounded-lg border border-yellow-300 dark:border-yellow-700">
                                <p className="mb-4 text-black dark:text-yellow-100 font-medium">
                                    🔗 Connect your wallet to claim your free data bundle
                                </p>
                            </div>
                        ) : !isWhitelisted ? (
                            <div className="text-center py-4 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-black rounded-lg border border-yellow-300 dark:border-yellow-700">
                                <p className="mb-4 text-black dark:text-yellow-100 font-medium">
                                    ⚠️ You need to be verified and whitelisted to claim this bundle.
                                </p>
                                <Button
                                    onClick={() => window.location.href = '/identity'}
                                    disabled={loadingWhitelist}
                                    className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-black dark:text-white font-bold border-2 border-black dark:border-yellow-400 shadow-lg hover:shadow-xl transition-all duration-200"
                                >
                                    {loadingWhitelist ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Checking status...
                                        </>
                                    ) : (
                                        '🔐 Go to Identity Verification'
                                    )}
                                </Button>
                            </div>
                        ) : !canClaim ? (
                            <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-black rounded-lg border border-yellow-300 dark:border-yellow-700 p-4">
                                <ClaimStatusDisplay
                                    isLoading={isProcessing}
                                    canClaim={canClaim}
                                    timeRemaining={timeRemaining}
                                />
                            </div>
                        ) : (
                            <>
                                <div className="bg-gradient-to-br from-white via-black-50 to-primary-50 dark:from-black dark:via-black-0 dark:to-black p-6 rounded-xl border border-primary-400/20 dark:border-primary-400/30">
                                    <p className="text-black dark:text-yellow-100 font-bold text-lg mb-2">
                                        🎉 You can claim your free data bundle today! 🎉
                                    </p>
                                </div>

                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                        <FormField
                                            control={form.control}
                                            name="country"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-black/80 dark:text-white/60  font-light text-sm">COUNTRY</FormLabel>
                                                    <FormControl>
                                                        <CountrySelector
                                                            value={field.value}
                                                            onChange={(val) => {
                                                                field.onChange(val);
                                                                if (val) setCountryCurrency(val);
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 dark:from-yellow-400/10 to-transparent pointer-events-none rounded-lg"></div>

                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />


                                        <FormField
                                            control={form.control}
                                            name="network"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-black/80 dark:text-white/60  font-light text-sm"> NETWORK PROVIDER</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !watchCountry || networks.length === 0}>
                                                        <FormControl>
                                                            <SelectTrigger className="border-yellow-300 dark:border-yellow-700 focus:border-yellow-500 dark:focus:border-yellow-500 bg-white dark:bg-black text-black dark:text-yellow-100">
                                                                <SelectValue placeholder="Select network provider" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-white dark:bg-black border-yellow-300 dark:border-yellow-700">
                                                            {networks.map((network) => (
                                                                <SelectItem
                                                                    key={network.id}
                                                                    value={network.id}
                                                                    className="text-black dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                                                                >
                                                                    {network.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {isLoading && <div className="text-sm text-black-600 dark:text-yellow-300 mt-1 flex items-center">
                                                        <Loader2 className="h-3 w-3 animate-spin mr-1 text-primary/900 dark:text-white/60 " /> Loading providers...
                                                    </div>}
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="plan"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-black/80 dark:text-white/60  font-light text-sm">DATA PLAN</FormLabel>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                        disabled={isLoading || !watchNetwork || availablePlans.length === 0}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="bg-gray-100 dark:bg-white/10  text-black/90 dark:text-white/90">
                                                                <SelectValue placeholder="Select data plan" className='text-xs' />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="bg-white dark:bg-black border-yellow-300 dark:border-yellow-700">
                                                            {availablePlans.map((plan) => (
                                                                <SelectItem
                                                                    key={plan.id}
                                                                    value={plan.id}
                                                                    className="text-black dark:text-yellow-100 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                                                                >
                                                                    {plan.name} - {plan.price}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {isLoading && (
                                                        <div className="text-sm text-yellow-700 dark:text-yellow-400 mt-1 flex items-center font-medium">
                                                            <Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading plans...
                                                        </div>
                                                    )}
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
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
                                                            className="text-xs bg-gray-100 dark:bg-white/10  text-black-900 dark:text-white/90"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
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
                                                            className="text-xs bg-gray-100 dark:bg-white/10 "
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </form>
                                </Form>
                            </>
                        )}
                    </CardContent>

                    <CardFooter className="bg-gradient-to-r from-yellow-400 to-yellow-500 dark:from-yellow-600 dark:to-yellow-700 rounded-b-lg">
                        <Button
                            className="w-full bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-yellow-400 dark:text-black font-bold text-lg py-6 border-2 border-yellow-300 dark:border-black shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                            disabled={!canClaim || isClaiming || isProcessing || !selectedPlan || !form.watch("phoneNumber") || form.watch("phoneNumber").length < 10}
                            onClick={form.handleSubmit(onSubmit)}
                        >
                            {isClaiming || isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Claiming...
                                </>
                            ) : (
                                '🎁 Claim Free Data Bundle 🎁'
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* GoodDollar Rewards Section */}
            <div className="mb-12">
                <Engagement />
            </div>
        </div>
    );
}