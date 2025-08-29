"use client";
import React, { useEffect, useState, Suspense } from "react"
import { useActiveAccount } from 'thirdweb/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIdentitySDK } from "@goodsdks/identity-sdk"
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

import { VerifyButton } from "@/components/identity/VerifyButton"
import { IdentityCard } from "@/components/identity/IdentityCard"
import { SigningModal } from "@/components/identity/SigningModal"
import HelpSection from "@/components/identity/HelpSection";

function IdentityVerification() {
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
  const identitySDK = useIdentitySDK("production")

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
    <div className="flex flex-col items-center p-6 min-h-screen bg-gradient-to-br from-black/90via-amber-50/30 to-yellow-50/20 dark:from-black/90 dark:via-black/90 dark:to-amber-900/20">
      <div className="max-w-xl w-full flex flex-col items-center">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 dark:from-amber-500 dark:to-yellow-600 rounded-full mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-black/90 via-amber-700 to-yellow-700 dark:from-black/90 dark:via-amber-300 dark:to-yellow-300 bg-clip-text text-transparent mb-2">
            GoodDollar Identity Verification
          </h1>
          <p className="text-black/90 dark:text-white/90 font-medium">
            Secure • Trusted • Decentralized
          </p>
        </div>

        {/* User Interaction Section */}
        <Card className="w-full bg-white/80 dark:bg-black/90 backdrop-blur-sm border border-amber-200/50 dark:border-amber-700/30 shadow-xl shadow-amber-500/10 dark:shadow-amber-500/20">
          <CardContent className="pt-6">
            {isConnected && loadingWhitelist ? (
              <div className="flex flex-col items-center justify-center my-8 p-6 bg-gradient-to-br from-amber-50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/10 rounded-lg border border-amber-200/30 dark:border-amber-700/20">
                <Loader2 className="h-10 w-10 animate-spin text-amber-600 dark:text-amber-400 mb-3" />
                <p className="text-black/90 dark:text-white/90 font-medium">Verifying your status...</p>
              </div>
            ) : null}

            {isConnected &&
              !loadingWhitelist &&
              (isVerified || isWhitelisted) && (
                <div className="flex flex-col items-center p-6">
                  <div className="w-full bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-black-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/30 p-6 mb-6">
                    <IdentityCard />
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-black-900/30 rounded-lg border border-emerald-300/50 dark:border-emerald-600/30">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-500 dark:bg-emerald-400 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white dark:text-emerald-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-emerald-800 dark:text-emerald-200 font-semibold">
                      You are successfully verified and whitelisted
                    </p>
                  </div>
                </div>
              )}

            {isConnected &&
            !loadingWhitelist &&
            !isVerified &&
            !isWhitelisted ? (
              <div className="flex flex-col items-center gap-6 p-6">
                <div className="w-full bg-gradient-to-br from-amber-50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/10 rounded-xl border border-amber-200/50 dark:border-amber-700/30 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 dark:from-amber-500 dark:to-yellow-600 rounded-lg flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-black/90 dark:text-white/90">Identity Verification Required</h3>
                      <p className="text-black/90 dark:text-white/90">Complete verification to access all features</p>
                    </div>
                  </div>
                  
                  <VerifyButton
                    onVerificationSuccess={handleVerificationSuccess}
                  />
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-black/90 dark:bg-black/90 rounded-lg border border-black/90 dark:border-black/90">
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/90 dark:text-white/90 leading-relaxed">
                    Verification through GoodDollar ensures secure access and helps maintain platform integrity. 
                    Your privacy and data security are our top priorities.
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-6 w-full">
          <div className="backdrop-blur-sm">
            <HelpSection />
          </div>
        </div>
      </div>

      <SigningModal
        open={isSigningModalOpen}
        onClose={() => setIsSigningModalOpen(false)}
      />
    </div>
  );
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
      <IdentityVerification />
    </Suspense>
  )
}
