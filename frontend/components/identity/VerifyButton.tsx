import React, { useMemo } from "react"
import { Button } from "../ui/button"
import { IdentitySDK } from "@goodsdks/citizen-sdk"
import { useActiveAccount } from "thirdweb/react"
import { toast } from "sonner"
import { createPublicClient, createWalletClient, custom, http, webSocket, fallback } from 'viem';
import { celo } from 'viem/chains';

interface VerifyButtonProps {
  onVerificationSuccess: () => void
}

export const VerifyButton: React.FC<VerifyButtonProps> = ({
  onVerificationSuccess,
}) => {
  const account = useActiveAccount()
  const address = account?.address
  const isConnected = !!address
  
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
        const identitySDK = new IdentitySDK({
          publicClient: publicClient as any,
          walletClient: walletClient as any,
          env: "production"
        });
        return identitySDK;
      } catch (error) {
        console.error('Failed to initialize IdentitySDK:', error);
        return null;
      }
    }
    return null;
  }, [publicClient, walletClient, isConnected]);

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
      toast.error("Verification failed. Please try again.")
    }
  }

  return (
    <Button 
      onClick={handleVerify}
      className="bg-primary/90 text-black hover:bg-black hover:text-primary/90 dark:bg-primary dark:text-black/90 hover:dark:bg-black border-2 border-primary hover:border-black dark:hover:border-black dark:hover:bg-white dark:hover:text-black duration-200"
    >
      Verify Me
    </Button>
  )
}