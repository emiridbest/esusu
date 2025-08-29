import React, { useEffect, useState } from "react"
import { useIdentitySDK } from "@goodsdks/identity-sdk"
import { useActiveAccount } from "thirdweb/react"
import { Card, CardContent } from "../ui/card"

export const IdentityCard: React.FC = () => {
  const account = useActiveAccount()
  const address = account?.address
  const identitySDK = useIdentitySDK("production")
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