import React from "react"
import { Button } from "@/components/ui/button"
import { useIdentitySDK } from "@goodsdks/identity-sdk"
import { useAccount } from "wagmi"

interface VerifyButtonProps {
  onVerificationSuccess: () => void
}

export const VerifyButton: React.FC<VerifyButtonProps> = ({
  onVerificationSuccess,
}) => {
  const { address } = useAccount()
  const identitySDK = useIdentitySDK("development")

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