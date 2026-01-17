
export const ENGAGEMENT_CONFIG = {
  // Development contract (allows anyone to approve apps)
  DEV_REWARDS_CONTRACT: "0xb44fC3A592aDaA257AECe1Ae8956019EA53d0465" as `0x${string}`,

  // Production contract (requires Good Labs approval)
  PROD_REWARDS_CONTRACT: "0x25db74CF4E7BA120526fd87e159CF656d94bAE43" as `0x${string}`,


  APP_ADDRESS: (process.env.NEXT_PUBLIC_APP_ADDRESS as `0x${string}`) || "0x4d4cC2E0c5cBC9737A0dEc28d7C2510E2BEF5A09" as `0x${string}`,

  // Default inviter address (optional - can be your main wallet or any address)
  INVITER_ADDRESS: (process.env.NEXT_PUBLIC_INVITER_ADDRESS as `0x${string}`) || "0x4d4cC2E0c5cBC9737A0dEc28d7C2510E2BEF5A09" as `0x${string}`,

  // Claim cooldown period (180 days in milliseconds)
  COOLDOWN_PERIOD: 180 * 24 * 60 * 60 * 1000,

  // Block validity period (how many blocks the signature is valid)
  SIGNATURE_VALIDITY_BLOCKS: BigInt(10), // Changed to 10 as per integration guide
}

// Helper to check if user is eligible (basic validation)
export function validateUserEligibility(address: string | undefined): boolean {
  if (!address) return false
  if (!address.startsWith('0x') || address.length !== 42) return false
  return true
}

// Helper to format transaction hash for display
export function formatTransactionHash(hash: string, length = 10): string {
  if (hash.length <= length) return hash
  return `${hash.slice(0, length / 2)}...${hash.slice(-length / 2)}`
}

// Helper to format error messages
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Common error patterns and user-friendly messages
    if (error.message.includes('User rejected')) {
      return 'Transaction was cancelled by user'
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for gas fees'
    }
    if (error.message.includes('not eligible')) {
      return 'Not eligible to claim rewards. Make sure your wallet is verified on goodwallet.xyz'
    }
    if (error.message.includes('already claimed')) {
      return 'Rewards already claimed. You can claim again after the cooldown period (180 days)'
    }
    if (error.message.includes('network')) {
      return 'Network error. Please check your connection and try again'
    }
    return error.message
  }
  return 'An unknown error occurred'
}

// Helper to calculate next claim date
export function getNextClaimDate(lastClaimTimestamp?: number): Date | null {
  if (!lastClaimTimestamp) return null
  return new Date(lastClaimTimestamp + ENGAGEMENT_CONFIG.COOLDOWN_PERIOD)
}

// Helper to check if user can claim based on last claim time
export function canClaimBasedOnTime(lastClaimTimestamp?: number): boolean {
  if (!lastClaimTimestamp) return true
  const now = Date.now()
  return (now - lastClaimTimestamp) >= ENGAGEMENT_CONFIG.COOLDOWN_PERIOD
}

// Helper to get Celo Explorer URL for transaction
export function getTransactionUrl(hash: string): string {
  return `https://explorer.celo.org/mainnet/tx/${hash}`
}

// Helper to validate environment configuration
export function validateConfiguration(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []


  if (!ENGAGEMENT_CONFIG.APP_ADDRESS || ENGAGEMENT_CONFIG.APP_ADDRESS === "0x4d4cC2E0c5cBC9737A0dEc28d7C2510E2BEF5A09") {
  }

  if (!ENGAGEMENT_CONFIG.INVITER_ADDRESS || ENGAGEMENT_CONFIG.INVITER_ADDRESS === "0x4d4cC2E0c5cBC9737A0dEc28d7C2510E2BEF5A09") {
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
