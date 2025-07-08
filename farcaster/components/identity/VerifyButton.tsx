import React from "react"
import { Button } from "../ui/button"
import { useIdentitySDK } from "@goodsdks/identity-sdk"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import sdk from "@farcaster/frame-sdk"

interface VerifyButtonProps {
  onVerificationSuccess: () => void
}

export const VerifyButton: React.FC<VerifyButtonProps> = ({
  onVerificationSuccess,
}) => {
  const { address } = useAccount()
  const identitySDK = useIdentitySDK("production")

  const handleVerify = async () => {
    if (!identitySDK || !address) return

    try {
      const fvLink = await identitySDK.generateFVLink(
        false,
        window.location.href,
        42220,
      )

      sdk.actions.openUrl(fvLink)
      if (window === window.parent) {
        window.location.href = fvLink
      }
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