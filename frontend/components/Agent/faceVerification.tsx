"use client";

import { useIdentitySDK } from "@goodsdks/react-hooks"
import { toast } from 'sonner';
import { useAccount } from "wagmi";

interface WhitelistUserProps {
    onSuccess?: () => void;
}

export function WhitelistUser({ onSuccess }: WhitelistUserProps) {
    const { sdk: identitySDK } = useIdentitySDK()
    const { address: userAddress } = useAccount()


    const handleVerification = async () => {
      if (!identitySDK) {
        toast.error("Identity SDK not initialized")
        return
      }
  
      try {
        // Generate FV link with current URL as callback
        const currentUrl = window.location.href
        const fvLink = await identitySDK.generateFVLink(false, currentUrl)
        window.location.href = fvLink
        // Track successful attempt
        try {
          await fetch('/api/verification/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: userAddress,
              timestamp: new Date().toISOString(),
              success: true,
              extra: { redirectedTo: fvLink }
            })
          });
        } catch { }
      } catch (err) {
        console.error("Error generating verification link:", err)
        toast.error("Failed to generate verification link")
      }
    }
    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-white rounded-lg">
            <h3 className="text-lg font-semibold">Whitelist User</h3>
            <p className="text-sm text-gray-600 text-center">
                Click the button below to verify your identity and get whitelisted for agent rewards.
            </p>

            <button
                onClick={handleVerification}
                disabled={!userAddress}
                className="bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white px-6 py-2 rounded w-full font-semibold"
            >
                Whitelist User
            </button>
        </div>
    );
}