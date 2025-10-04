"use client";
import React, { useEffect, useState, Suspense, useMemo } from "react"
import { useActiveAccount } from 'thirdweb/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IdentitySDK } from "@goodsdks/citizen-sdk"
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { createPublicClient, createWalletClient, custom, http, webSocket, fallback } from 'viem';
import { celo } from 'viem/chains';

import { VerifyButton } from "@/components/profile/VerifyButton"
import { IdentityCard } from "@/components/profile/IdentityCard"
import { SigningModal } from "@/components/profile/SigningModal"
import UserInfoTabs from "@/components/profile/UserInfoTabs";

function ProfileContent() {
  const account = useActiveAccount();
  const address = account?.address;
  const isConnected = !!address;
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
      transport: fallback([
        webSocket('wss://celo.drpc.org'),
        http('https://celo.drpc.org')
      ])
    });
  }, []);

  const walletClient = useMemo(() => {
    if (isConnected && typeof window !== 'undefined' && window.ethereum && address) {
      return createWalletClient({
        account: address as `0x${string}`,
        chain: celo,
        transport: custom(window.ethereum)
      });
    }
    return null;
  }, [isConnected, address]);

  const identitySDK = useMemo(() => {
    if (isConnected && publicClient && walletClient) {
      try {
        return new IdentitySDK({
          publicClient: publicClient as any,
          walletClient: walletClient as any,
          env: 'development'
        });
      } catch (error) {
        console.error('Failed to initialize IdentitySDK:', error);
        return null;
      }
    }
    return null;
  }, [publicClient, walletClient, isConnected]);

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
    <div className="flex flex-col items-center p-6 bg-[#F7FAFC] min-h-screen">
      <div className="max-w-xl w-full flex flex-col items-center">
        <h1 className="text-2xl font-bold text-center mb-4">
          GoodDollar Identity Verification
        </h1>

        {/* User Interaction Section */}
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center mb-4">
              {!isConnected ? (
                <p className="text-red-500 mb-4">
                  Please connect your wallet to proceed.
                </p>
              ) : <UserInfoTabs />}
            </div>

            {isConnected && loadingWhitelist ? (
              <div className="flex justify-center my-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : null}

            {isConnected &&
              !loadingWhitelist &&
              (isVerified || isWhitelisted) && (
                <div className="flex flex-col items-center">
                  <IdentityCard />
                  <p className="mt-4 text-green-600">
                    You are successfully verified and/or whitelisted.
                  </p>
                </div>
              )}

            {isConnected &&
            !loadingWhitelist &&
            !isVerified &&
            !isWhitelisted ? (
              <div className="flex flex-col items-center gap-3">
                <VerifyButton
                  onVerificationSuccess={handleVerificationSuccess}
                />
                <p className="text-sm text-gray-500">
                  You need to verify your identity via GoodDollar to continue.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="flex flex-col items-center justify-center mt-6 text-gray-500">
          <p className="text-sm">
            Need help? Visit our docs:{" "}
            <Link 
              href="https://docs.gooddollar.org"
              className="text-blue-600 hover:underline"
              target="_blank"
            >
              GoodDollar Docs
            </Link>
            .
          </p>
          <p className="text-sm">
            Or join our Developer Communities at:{" "}
            <Link 
              href="https://ubi.gd/GoodBuildersDiscord"
              className="text-blue-600 hover:underline"
              target="_blank"
            >
              GoodBuilders Discord
            </Link>
            .
          </p>
        </div>
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
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
