import React, { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { IdentitySDK } from "@goodsdks/citizen-sdk"
import { useAccount, useWalletClient } from "wagmi"
import { createPublicClient, createWalletClient, custom, http, webSocket, fallback } from 'viem';
import { celo } from 'viem/chains';

interface VerifyButtonProps {
  onVerificationSuccess: () => void
}

export const VerifyButton: React.FC<VerifyButtonProps> = ({
  onVerificationSuccess,
}) => {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  
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
        return new IdentitySDK(
          publicClient as any,
          walletClientForSDK as any
        );
      } catch (error) {
        console.error('Failed to initialize IdentitySDK:', error);
        return null;
      }
    }
    return null;
  }, [publicClient, walletClientForSDK, isConnected]);

  const handleVerify = async () => {
    if (!identitySDK || !address) return

    try {
      const fvLink = await identitySDK.generateFVLink(
        false,
        window.location.href,
        42220,
      )

      window.location.href = fvLink
    } catch (error) {
      console.error("Verification failed:", error)
      // Handle error (e.g., show toast)
    }
  }

  return (
    <Button 
      onClick={handleVerify}
      className="bg-primary text-black hover:bg-black dark:bg-primary dark:text-white hover:dark:bg-black border-2 border-primary hover:border-black dark:hover:border-black dark:hover:bg-white dark:hover:text-black duration-200"
    >
      Verify Me
    </Button>
  )
}