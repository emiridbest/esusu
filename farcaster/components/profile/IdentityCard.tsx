import React, { useEffect, useState, useMemo } from "react"
import { IdentitySDK } from "@goodsdks/citizen-sdk"
import { useAccount, useWalletClient } from "wagmi"
import { Card, CardContent } from "@/components/ui/card"
import { createPublicClient, createWalletClient, custom, http, webSocket, fallback } from 'viem';
import { celo } from 'viem/chains';

export const IdentityCard: React.FC = () => {
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
  const [expiry, setExpiry] = useState<string | undefined>(undefined)

  useEffect(() => {
    const fetchExpiry = async () => {
      if (!identitySDK || !address) return

      const identityExpiry = await identitySDK.getIdentityExpiryData(address as `0x${string}`)

      const { expiryTimestamp } = identitySDK.calculateIdentityExpiry(
        identityExpiry?.lastAuthenticated ?? BigInt(0),
        identityExpiry?.authPeriod ?? BigInt(0),
      )

      const date = new Date(Number(expiryTimestamp))
      const formattedExpiryTimestamp = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "2-digit",
      })

      if (formattedExpiryTimestamp) {
        setExpiry(formattedExpiryTimestamp)
      }
    }

    fetchExpiry()
  }, [address, identitySDK])

  if (!address) return null

  return (
    <Card className="w-[350px] shadow-md">
      <CardContent className="p-6">
        <p className="text-gray-800 mb-2 break-all">
          <span className="font-medium">Wallet Address:</span> {address}
        </p>
        <p className="text-gray-800">
          <span className="font-medium">
            {expiry && new Date(expiry) < new Date() ? "Expired" : "Expiry"}:
          </span>{" "}
          {expiry || "Not Verified"}
        </p>
      </CardContent>
    </Card>
  )
}