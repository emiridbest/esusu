"use client";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Info,
  Clock,
  Shield,
  Check,
  Copy
} from "lucide-react";
import { toast } from 'sonner';

//@ts-ignore
import { useEngagementRewards, DEV_REWARDS_CONTRACT, REWARDS_CONTRACT } from '@goodsdks/engagement-sdk'
import {
  ENGAGEMENT_CONFIG,
  validateUserEligibility,
  formatErrorMessage,
  formatTransactionHash,
  getTransactionUrl,
  validateConfiguration
} from '@/lib/engagementHelpers'
import { useParams } from "react-router-dom";
import { useIdentitySDK } from '@goodsdks/identity-sdk';

interface InviteReward {
  invitedWallet: string
  rewardAmount: string
}
// Configuration constants - using the SDK constants as per integration guide
const APP_ADDRESS = ENGAGEMENT_CONFIG.APP_ADDRESS
const REWARDS_CONTRACT_ADDRESS = REWARDS_CONTRACT
const INVITER_ADDRESS = ENGAGEMENT_CONFIG.INVITER_ADDRESS

// Helper function to call our API route
async function getAppSignature(params: {
  user: string
  validUntilBlock: string
  inviter: string
}): Promise<string> {
  const response = await fetch('/api/getAppSignature', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get app signature')
  }

  const data = await response.json()
  return data.signature
}

export default function Engagement() {
  return (
    <div className="max-w-4xl mx-auto mt-2">
      <RewardsClaimCard />
    </div>
  );
}

const INVITE_STORAGE_KEY = "invite_inviter"

const formatAmount = (amount: bigint) => {
  return (Number(amount) / 1e18).toFixed(2)
}
const RewardsClaimCard = () => {
  const { address: userAddress, isConnected } = useAccount()
  const engagementRewards = useEngagementRewards(REWARDS_CONTRACT_ADDRESS)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string>("")
  const [claimStep, setClaimStep] = useState<'idle' | 'checking' | 'signing' | 'submitting' | 'success' | 'error'>('idle')
  const identitySDK = useIdentitySDK('production')

  const [inviteLink, setInviteLink] = useState<string>("")
  const [isCopied, setIsCopied] = useState(false)
  const [inviteRewards, setInviteRewards] = useState<InviteReward[]>([])
  const [rewardAmount, setRewardAmount] = useState<bigint>(BigInt(0))
  const [inviterShare, setInviterShare] = useState<number>(0)
  const [isClaimable, setIsClaimable] = useState(false)
  const { inviterAddress } = useParams()
  const [isWhitelisted, setIsWhitelisted] = useState<boolean>(false)
  const [checkingWhitelist, setCheckingWhitelist] = useState<boolean>(true)
  const [lastTransactionHash, setLastTransactionHash] = useState<string | null>(null)
  const userWallet = userAddress

  // Handle inviter storage and reward details
  useEffect(() => {
    if (!engagementRewards || !userAddress) return
    const fetchRewardDetails = async () => {
      try {
        // Get reward amount and distribution percentages
        const [amount, [, , , , , userInviterPercentage, userPercentage]] =
          await Promise.all([
            engagementRewards.getAppRewards(REWARDS_CONTRACT_ADDRESS),
            engagementRewards.getAppInfo(APP_ADDRESS),
          ])

        if (amount) {
          // engagementRewards.getAppRewards returns an object with multiple bigint fields.
          // Use the appropriate bigint field (appRewards or totalRewards) rather than the whole object.
          // Prefer appRewards for the app-specific reward amount; fall back to totalRewards, then 0n.
          setRewardAmount(
            (amount as { appRewards?: bigint; totalRewards?: bigint }).appRewards ??
            (amount as { appRewards?: bigint; totalRewards?: bigint }).totalRewards ??
            BigInt(0),
          )
        }
        // Calculate share percentages
        const totalUserInviter = Number(userInviterPercentage) || 0
        const userPercent = Number(userPercentage) || 0
        setInviterShare(
          Math.floor((totalUserInviter * (100 - userPercent)) / 100),
        )

        // Check if rewards can be claimed
        const canClaim = await engagementRewards.canClaim(
          APP_ADDRESS,
          userAddress,
        )
        setIsClaimable(canClaim)

        // Get recent rewards
        const events = await engagementRewards.getAppRewardEvents(APP_ADDRESS
          //,{inviter: userAddress,}
        )

        // Filter and map events where this wallet was the inviter
        const inviterEvents = events
          .filter(
            (event) =>
              event.inviter?.toLowerCase() === userAddress.toLowerCase(),
          )
          .map((event) => ({
            invitedWallet: event.user || "Unknown",
            rewardAmount: formatAmount(
              BigInt(event.inviterAmount || 0),
            ).toString(),
          }))

        setInviteRewards(inviterEvents)
      } catch (err) {
        console.error("Error fetching reward details:", err)
        toast.error("Failed to load reward details")
      }
    }

    fetchRewardDetails()
  }, [engagementRewards, userAddress])

  // Handle invite link and inviter storage
  useEffect(() => {
    // Store inviter if in URL params
    if (inviterAddress) {
      localStorage.setItem(INVITE_STORAGE_KEY, inviterAddress)
    }

    // Update invite link when wallet is connected
    if (userAddress) {
      const baseUrl = window.location.origin
      setInviteLink(`${baseUrl}?inviterAddress=${userAddress}`) 
    } else {
      setInviteLink("")
    }
  }, [inviterAddress, userAddress])

  // Add whitelist check effect
  useEffect(() => {
    if (!userAddress || !identitySDK) {
      setCheckingWhitelist(false)
      return
    }

    const checkWhitelistStatus = async () => {
      try {
        const { isWhitelisted } = await identitySDK.getWhitelistedRoot(userAddress)
        setIsWhitelisted(isWhitelisted)
      } catch (error) {
        console.error("Error checking whitelist status:", error)
      } finally {
        setCheckingWhitelist(false)
      }
    }

    checkWhitelistStatus()
  }, [identitySDK, userAddress])


  const copyInviteLink = (text: string, type: 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setIsCopied(true)
      toast.success("Invite link copied to clipboard")
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  // Check configuration on component mount
  const configValidation = validateConfiguration()

  // SDK is ready when hook returns non-null
  if (!engagementRewards) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Initializing GoodDollar SDK...</p>
        </CardContent>
      </Card>
    )
  }

  // Show configuration errors
  if (!configValidation.isValid) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-400 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Configuration Required
          </CardTitle>
          <CardDescription>
            Please complete the setup to enable reward claims.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {configValidation.errors.map((error, index) => (
              <li key={index} className="flex items-center text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                {error}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )
  }
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
    } catch (err) {
      console.error("Error generating verification link:", err)
      toast.error("Failed to generate verification link")
    }
  }
  const handleClaim = async () => {
    if (!validateUserEligibility(userAddress) || !isConnected) {
      setStatus("Please connect your wallet to continue")
      setClaimStep('error')
      return
    }

    if (!isWhitelisted) {
      setStatus("Verify your account to claim rewards")
      setClaimStep('error')
      return
    }

    if (!isClaimable) {
      setStatus("No rewards available yet. Share your invite link to start earning!")
      setClaimStep('error')
      return
    }

    setLastTransactionHash(null)
    setIsLoading(true)
    setClaimStep('checking')
    setStatus("Verifying eligibility...")

    try {
      // First check if user can claim
      /**const isEligible = await engagementRewards.canClaim(APP_ADDRESS, userAddress!).catch((error: any) => {
        return false
      })
  
      if (!isEligible) {
        setStatus("Coming Soon!!!")
        setClaimStep('error')
        return
      }*/

      setClaimStep('signing')
      setStatus("Preparing transaction...")

      // Get current block and prepare signature if needed
      const currentBlock = await engagementRewards.getCurrentBlockNumber()
      const validUntilBlock = currentBlock + ENGAGEMENT_CONFIG.SIGNATURE_VALIDITY_BLOCKS

      // Generate signature for first-time users or after app re-apply
      let userSignature = "0x" as `0x${string}`

      try {
        setStatus("Please sign the transaction in your wallet...")

        userSignature = await engagementRewards.signClaim(
          APP_ADDRESS,
          inviterAddress as `0x${string}` || INVITER_ADDRESS,
          validUntilBlock
        )
      } catch (signError) {
        userSignature = "0x" as `0x${string}`
      }

      setStatus("Processing your claim...")

      // Get app signature from backend
      const appSignature = await getAppSignature({
        user: userAddress!,
        validUntilBlock: validUntilBlock.toString(),
        inviter: inviterAddress || INVITER_ADDRESS
      })

      setClaimStep('submitting')
      setStatus("Submitting to blockchain...")

      // Submit claim
      const receipt = await engagementRewards.nonContractAppClaim(
        APP_ADDRESS,
        inviterAddress as `0x${string}` || INVITER_ADDRESS,
        validUntilBlock,
        userSignature,
        appSignature as `0x${string}`
      )

      const shortHash = formatTransactionHash(receipt.transactionHash)
      const txUrl = getTransactionUrl(receipt.transactionHash)

      setLastTransactionHash(receipt.transactionHash)
      setStatus(`Transaction completed: ${shortHash}`)
      setClaimStep('success')

      // Open transaction in new tab after a short delay
      setTimeout(() => {
        window.open(txUrl, '_blank')
      }, 2000)

    } catch (error) {
      console.error("Claim failed:", error)
      const friendlyError = formatErrorMessage(error)
      setStatus(friendlyError)
      setClaimStep('error')
    } finally {
      setIsLoading(false)
    }
  }
  const getStepIcon = () => {
    if (claimStep === 'success') {
      return <CheckCircle2 className="w-5 h-5 text-yellow-500" />
    }
    if (claimStep === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-600" />
    }
    if (isLoading) {
      return <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
    }
    return <Wallet className="w-5 h-5 text-slate-600 dark:text-slate-300" />
  }

  const getButtonText = () => {
    if (!isConnected) return 'Connect Wallet'
    if (!isWhitelisted) return 'Verify to Claim'
    if (!isClaimable && claimStep !== 'success') return 'No Claim Available'
    if (claimStep === 'success') return 'Claim Successful!'
    if (isLoading) {
      switch (claimStep) {
        case 'checking':
          return 'Checking eligibility...'
        case 'signing':
          return 'Please sign in wallet...'
        case 'submitting':
          return 'Processing claim...'
        default:
          return 'Processing...'
      }
    }
    return 'Claim Rewards'
  }

  return (
    <div className="container py-8 bg-gradient-to-br min-h-screen">
      <div className="max-w-md mx-auto">
        <div className="space-y-6">
          <Card className="border shadow-lg dark:bg-black">
            <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-t-lg">
              <div className="flex flex-col space-y-1 text-black/90">
                <CardTitle className="text-2xl font-bold">
                  Claim Loyalty Rewards
                </CardTitle>
                <CardDescription className="text-black/90 dark:text-black/90">
                  Get rewarded in G$ tokens as you use Esusu
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg mt-4 border bg-yellow-50/80 dark:bg-black border/70 p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-black/90">
                    Available to claim
                  </p>
                  <p className="text-3xl font-bold text-black dark:text-white/90">
                    {isClaimable ? '4000 ' : 0} G$
                  </p>
                  </div>
                </div>
                <p className="text-sm text-black dark:text-white/90">
                  {checkingWhitelist
                    ? 'Checking your verification status...'
                    : isWhitelisted
                      ? isClaimable
                        ? 'You are eligible to claim rewards right now.'
                        : 'No rewards are ready yet. Share your invite link to earn more.'
                      : 'Verify your account to unlock reward claiming.'}
                </p>
              </div>

              <div className="rounded-lg border bg-white/90 dark:bg-black/90 p-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Eligibility Requirements
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                    Complete face verification
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                    Start saving or paying for utilities on Esusu
                  </li>
                  <li className="flex items-center">
                    <Clock className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                    Claim rewards once every 180 days
                  </li>
                    <li className="flex items-center">
                      <Clock className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                      Invite others using your unique referral link to earn for each successful claim they make.
                    </li>
                </ul>
              </div>

              {status && (
                <Alert
                  className={`border ${claimStep === 'success'
                      ? 'border-green-200 bg-green-50'
                      : claimStep === 'error'
                        ? 'border-red-200 bg-red-50'
                        : 'border-yellow-200 bg-yellow-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {getStepIcon()}
                    <AlertDescription className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {status}
                    </AlertDescription>
                  </div>
                  {claimStep === 'success' && lastTransactionHash && (
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0 text-yellow-600 hover:text-yellow-700"
                      onClick={() => window.open(getTransactionUrl(lastTransactionHash), '_blank')}
                    >
                      View on Celo Explorer
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </Alert>
              )}

              <div className="pt-2">
                <Button
                  onClick={handleClaim}
                  disabled={!isConnected || isLoading || claimStep === 'success' || !isWhitelisted || !isClaimable || checkingWhitelist}
                  className="w-full h-12 text-lg font-semibold bg-yellow-500 dark:bg-yellow-500 text-black/90 hover:bg-yellow-600 transition-all duration-200"
                >
                  {getButtonText()}
                  {!isLoading && claimStep !== 'success' && isWhitelisted && isConnected && isClaimable && (
                    <ArrowRight className="w-5 h-5 ml-2" />
                  )}
                </Button>
              </div>

              {!isConnected && (
                <Alert className="border border-yellow-200 bg-yellow-50">
                  <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 mt-0.5" />
                    <AlertDescription className="text-sm text-slate-700">
                      Connect your wallet to see if you are eligible for rewards.
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>

          {!userWallet ? (
            <Card className="border dark:bg-black">
              <CardHeader>
                <CardTitle>Connect Your Wallet</CardTitle>
                <CardDescription>
                  Connect your wallet to generate your unique invite link and start earning rewards.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <Card className="border dark:bg-black">
                <CardHeader>
                  <CardTitle className="text-lg">Verification Status</CardTitle>
                  <CardDescription>
                    Keep your account verified to unlock invite earnings and reward claims.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {checkingWhitelist ? (
                    <p className="text-slate-600">Checking verification status...</p>
                  ) : isWhitelisted ? (
                    <p className="text-green-600 font-medium">Your account is verified! ✓</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-yellow-700 font-medium">
                        Your account needs verification.
                      </p>
                      <Button onClick={handleVerification} className="bg-yellow-500 text-black/90 hover:bg-yellow-400">
                        Get Verified
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-lg">Your Invite Link</CardTitle>
                  <CardDescription>
                    Share this link to invite friends and earn a share of their rewards.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-grow p-2 rounded border border-yellow-200 bg-yellow-50/70 text-slate-900"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyInviteLink(inviteLink, 'link')}
                      className="shrink-0"
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {isWhitelisted
                      ? `Share this link to earn ${inviterShare + 10}% of 4000 G$ for each new user who joins!`
                      : 'Verify your account to start sharing and earning rewards.'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-lg">Your Recent Rewards</CardTitle>
                  <CardDescription>
                    Track the invitations you have rewarded recently.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {inviteRewards.length > 0 ? (
                    <div className="space-y-4">
                      {inviteRewards.map((reward, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center rounded-lg border bg-yellow-50/70 p-4"
                        >
                          <div>
                            <p className="font-medium text-slate-900">Invited: {reward.invitedWallet}</p>
                          </div>
                          <p className="font-semibold text-slate-900">{reward.rewardAmount} G$</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-600">
                      {isWhitelisted
                        ? 'No rewards yet. Share your invite link to start earning!'
                        : 'Get verified to start earning rewards.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

      </div>
    </div>
  )
}