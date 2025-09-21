"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Wallet, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Info,
  Clock,
  Shield
} from "lucide-react";

import { useEngagementRewards, DEV_REWARDS_CONTRACT } from '@goodsdks/engagement-sdk'
import { 
  ENGAGEMENT_CONFIG, 
  validateUserEligibility, 
  formatErrorMessage, 
  formatTransactionHash,
  getTransactionUrl,
  validateConfiguration
} from '@/lib/engagementHelpers'

// Configuration constants - using the SDK constants as per integration guide
const REWARDS_CONTRACT_ADDRESS = DEV_REWARDS_CONTRACT 
const APP_ADDRESS = ENGAGEMENT_CONFIG.APP_ADDRESS
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
    <div className="min-h-screen  to-yellow-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">

        <RewardsClaimCard />
      </div>
    </div>
  );
}

const RewardsClaimCard = () => {
  const { address: userAddress, isConnected } = useAccount()
  const engagementRewards = useEngagementRewards(REWARDS_CONTRACT_ADDRESS)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string>("")
  const [claimStep, setClaimStep] = useState<'idle' | 'checking' | 'signing' | 'submitting' | 'success' | 'error'>('idle')
  
  // Check configuration on component mount
  const configValidation = validateConfiguration()
  
  // SDK is ready when hook returns non-null
  if (!engagementRewards) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full mx-auto mb-4"></div>
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

  const handleClaim = async () => {
    if (!validateUserEligibility(userAddress) || !isConnected) {
      setStatus("Please connect your wallet to continue")
      setClaimStep('error')
      return
    }

    setIsLoading(true)
    setClaimStep('checking')
    setStatus("Verifying eligibility...")

    try {
      // First check if user can claim
      const isEligible = await engagementRewards.canClaim(APP_ADDRESS, userAddress!).catch((error) => {
        console.log("Eligibility check error:", error)
        return false
      })
      
      if (!isEligible) {
        setStatus("Not eligible to claim at this time. Please ensure your wallet is verified on goodwallet.xyz and you haven't claimed recently.")
        setClaimStep('error')
        return
      }

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
          INVITER_ADDRESS,
          validUntilBlock
        )
      } catch (signError) {
        console.log("User signature error:", signError)
        userSignature = "0x" as `0x${string}`
      }

      setStatus("Processing your claim...")

      // Get app signature from backend
      const appSignature = await getAppSignature({
        user: userAddress!,
        validUntilBlock: validUntilBlock.toString(),
        inviter: INVITER_ADDRESS
      })
      
      setClaimStep('submitting')
      setStatus("Submitting to blockchain...")

      // Submit claim
      const receipt = await engagementRewards.nonContractAppClaim(
        APP_ADDRESS,
        INVITER_ADDRESS,
        validUntilBlock,
        userSignature,
        appSignature as `0x${string}`
      )

      const shortHash = formatTransactionHash(receipt.transactionHash)
      const txUrl = getTransactionUrl(receipt.transactionHash)
      
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

  const getStepIcon = (step: string) => {
    if (claimStep === 'success') return <CheckCircle2 className="w-5 h-5 text-yellow-600" />
    if (claimStep === 'error') return <AlertCircle className="w-5 h-5 text-red-600" />
    if (isLoading) return <div className="animate-spin w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full" />
    return <Wallet className="w-5 h-5 text-slate-600" />
  }

  const getButtonText = () => {
    if (claimStep === 'success') return 'Claim Successful!'
    if (isLoading) {
      switch (claimStep) {
        case 'checking': return 'Checking eligibility...'
        case 'signing': return 'Please sign in wallet...'
        case 'submitting': return 'Processing claim...'
        default: return 'Processing...'
      }
    }
    return 'Claim 3,000 G$ Tokens'
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {/* Main Claim Card */}
      <Card className="md:col-span-2  shadow-xl">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Claim Your Rewards
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Get rewarded in G$ tokens as you use Esusu
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Eligibility Requirements */}
          <div className=" rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Eligibility Requirements
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                Do face verification 
              </li>
              <li className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                Start saving or paying for utilities on Esusu
              </li>
              <li className="flex items-center">
                <Clock className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                Claim reward once every 180 days
              </li>
            </ul>
          </div>

          {/* Status Display */}
          {status && (
            <Alert className={`
              ${claimStep === 'success' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950' : ''}
              ${claimStep === 'error' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' : ''}
              ${['checking', 'signing', 'submitting'].includes(claimStep) ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950' : ''}
            `}>
              <div className="flex items-center">
                {getStepIcon(claimStep)}
                <AlertDescription className="ml-2 font-medium">
                  {status}
                </AlertDescription>
              </div>
              {claimStep === 'success' && (
                <button 
                  onClick={() => window.open(getTransactionUrl(status.split(': ')[1]), '_blank')}
                  className="mt-2 text-sm text-yellow-600 hover:text-yellow-800 flex items-center"
                >
                  View on Celo Explorer
                  <ExternalLink className="w-3 h-3 ml-1" />
                </button>
              )}
            </Alert>
          )}

          {/* Action Button */}
          <div className="pt-4">
            <Button 
              onClick={handleClaim}
              disabled={!isConnected || isLoading || claimStep === 'success'}
              className={`w-full h-12 text-lg font-semibold transition-all duration-200 ${
                claimStep === 'success' 
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {getButtonText()}
              {!isLoading && claimStep !== 'success' && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </div>

          {!isConnected && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Connect your wallet to see if you are eligible for rewards.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Info Sidebar */}
      <div className="space-y-6">

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div className="flex items-start">
              <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-xs font-bold text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5">
                1
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">Verify Eligibility</div>
                <div className="text-slate-600 dark:text-slate-400">System checks if you can claim rewards</div>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-xs font-bold text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5">
                2
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">Sign Transaction</div>
                <div className="text-slate-600 dark:text-slate-400">Approve the claim in your wallet</div>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-xs font-bold text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5">
                3
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">Receive Tokens</div>
                <div className="text-slate-600 dark:text-slate-400">G$ tokens are sent to your wallet</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Powered by</div>
            <div className="font-bold text-yellow-600">GoodDollar Protocol</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Engagement Rewards</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}