"use client";
import React, { useEffect, useState, Suspense, useMemo } from "react"
import { useAccount, useWalletClient } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { IdentitySDK } from "@goodsdks/citizen-sdk"
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ShieldCheck, ExternalLink, HelpCircle } from "lucide-react";
import { createPublicClient, createWalletClient, custom, http, webSocket, fallback } from 'viem';
import { celo } from 'viem/chains';
import { Button } from "@/components/ui/button";

import { VerifyButton } from "@/components/profile/VerifyButton"
import { IdentityCard } from "@/components/profile/IdentityCard"
import { SigningModal } from "@/components/profile/SigningModal"
import UserInfoTabs from "@/components/profile/UserInfoTabs";

function ProfileContent() {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const router = useRouter();
    const [isSigningModalOpen, setIsSigningModalOpen] = useState(false)
    const [isVerified, setIsVerified] = useState<boolean | undefined>(false)
    const [isWhitelisted, setIsWhitelisted] = useState<boolean | undefined>(
        undefined,
    )
    const [loadingWhitelist, setLoadingWhitelist] = useState<boolean | undefined>(
        undefined,
    )

    const searchParams = useSearchParams();
    const [connectedAccount, setConnectedAccount] = useState<string | undefined>(
        undefined,
    )
    // Initialize IdentitySDK with proper viem clients
    const publicClient = useMemo(() => {
        return createPublicClient({
            chain: celo,
            transport: http('https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8', {
                timeout: 30_000,
                retryCount: 3,
            })
        });
    }, []);

    const walletClientForSDK = useMemo(() => {
        if (isConnected && walletClient && address) {
            return walletClient;
        }
        if (isConnected && typeof window !== 'undefined' && window.ethereum && address) {
            return createWalletClient({
                account: address as `0x${string}`,
                chain: celo,
                transport: custom(window.ethereum)
            });
        }
        return null;
    }, [isConnected, address, walletClient]);

    const identitySDK = useMemo(() => {
        if (isConnected && publicClient && walletClientForSDK) {
            try {
                return new IdentitySDK({
                    publicClient: publicClient as any,
                    walletClient: walletClientForSDK as any,
                    env: "production"
                });
            } catch (error) {
                console.error('Failed to initialize IdentitySDK:', error);
                return null;
            }
        }
        return null;
    }, [publicClient, walletClientForSDK, isConnected]);

    useEffect(() => {
        const verified = searchParams?.get("verified");

        if (verified === "true") {
            setIsVerified(true)
            window.history.replaceState({}, document.title, window.location.pathname)
        }
    }, [searchParams])

    useEffect(() => {
        const checkWhitelistStatus = async () => {
            if (address && isWhitelisted === undefined) {
                try {
                    setLoadingWhitelist(true)
                    setConnectedAccount(address)
                    const { isWhitelisted } =
                        (await identitySDK?.getWhitelistedRoot(address as `0x${string}`)) ?? {}

                    setIsWhitelisted(isWhitelisted)
                    setIsVerified(isWhitelisted ?? false)
                } catch (error) {
                    console.error("Error checking whitelist:", error)
                } finally {
                    setLoadingWhitelist(false)
                }
            }
        }

        if (address !== connectedAccount || !address) {
            setConnectedAccount(address)
            setIsWhitelisted(undefined)
            setIsVerified(undefined)
            checkWhitelistStatus()
        }
    }, [address, identitySDK, connectedAccount, isWhitelisted])

    const handleVerificationSuccess = () => {
        setIsVerified(true)
    }

    return (
        <div className="container mx-auto pb-24 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center space-x-4 mb-8">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl">
                        <ShieldCheck className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile & Verification</h1>
                        <p className="text-gray-500 dark:text-gray-400">Manage your identity and account settings</p>
                    </div>
                </div>

                {/* User Interaction Section */}
                <Card className="border-none bg-white/50 backdrop-blur-md dark:bg-black/90 shadow-lg">
                    <CardHeader>
                        <CardTitle>Identity Verification</CardTitle>
                        <CardDescription>Verify your identity with GoodDollar to unlock all features</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center justify-center w-full">
                            {!isConnected ? (
                                <div className="text-center py-8">
                                    <p className="text-red-500 mb-4 font-medium">
                                        Please connect your wallet to proceed
                                    </p>
                                </div>
                            ) : <UserInfoTabs />}
                        </div>

                        {isConnected && loadingWhitelist ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
                            </div>
                        ) : null}

                        {isConnected &&
                            !loadingWhitelist &&
                            (isVerified || isWhitelisted) && (
                                <div className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20 w-full">
                                    <IdentityCard />
                                    <div className="flex items-center mt-4 text-green-600 dark:text-green-400 font-medium">
                                        <ShieldCheck className="w-5 h-5 mr-2" />
                                        You are verified and whitelisted
                                    </div>
                                </div>
                            )}

                        {isConnected &&
                            !loadingWhitelist &&
                            !isVerified &&
                            !isWhitelisted ? (
                            <div className="flex flex-col items-center gap-4 p-6 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-100 dark:border-yellow-900/20">
                                <div className="text-center space-y-2">
                                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-500">Verification Required</h3>
                                    <p className="text-sm text-yellow-700/80 dark:text-yellow-500/80">
                                        You need to verify your identity via GoodDollar to continue using all features.
                                    </p>
                                </div>
                                <VerifyButton
                                    onVerificationSuccess={handleVerificationSuccess}
                                />
                            </div>
                        ) : null}
                    </CardContent>
                </Card>

                {/* Help Section */}
                <Card className="border-none bg-white/50 backdrop-blur-md dark:bg-black/90 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HelpCircle className="w-5 h-5" />
                            Support & Resources
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <a
                            href="https://docs.gooddollar.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="font-medium text-gray-700 dark:text-gray-300">GoodDollar Documentation</span>
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                        <a
                            href="https://ubi.gd/GoodBuildersDiscord"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="font-medium text-gray-700 dark:text-gray-300">Join Developer Community</span>
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                    </CardContent>
                </Card>
            </div>

            <SigningModal
                open={isSigningModalOpen}
                onClose={() => setIsSigningModalOpen(false)}
            />
        </div>
    )
}

function ProfileLoading() {
    return (
        <div className="flex justify-center items-center h-screen bg-gradient-radial from-white via-gray-50 to-gray-100 dark:from-black dark:via-black dark:to-black">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
        </div>
    )
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<ProfileLoading />}>
            <ProfileContent />
        </Suspense>
    )
}
