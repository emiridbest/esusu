import { NextResponse } from 'next/server'
import { createWalletClient, http, createPublicClient, Account } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import { EngagementRewardsSDK } from '@goodsdks/engagement-sdk'

// Environment variable validation for Client-Side Integration
function validateEnvVars() {
  const requiredEnvVars = {
    APP_PRIVATE_KEY: process.env.APP_PRIVATE_KEY,
    APP_ADDRESS: process.env.APP_ADDRESS,
    REWARDS_CONTRACT: process.env.NEXT_PUBLIC_REWARDS_CONTRACT
  }

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
    if (key !== 'APP_PRIVATE_KEY' && (!value.startsWith('0x') || value.length !== 42)) {
      throw new Error(`Invalid ${key} format: must be a valid Ethereum address`)
    }
    if (key === 'APP_PRIVATE_KEY' && (!value.startsWith('0x') || value.length !== 66)) {
      throw new Error(`Invalid ${key} format: must be a valid private key`)
    }
  }

  return requiredEnvVars
}

// App configuration from environment variables
let APP_PRIVATE_KEY: `0x${string}` | null = null
let APP_ADDRESS: `0x${string}` | null = null
let REWARDS_CONTRACT: `0x${string}` | null = null
let account: Account | null = null

// Initialize variables safely
try {
  const envVars = validateEnvVars()
  APP_PRIVATE_KEY = envVars.APP_PRIVATE_KEY as `0x${string}`
  APP_ADDRESS = envVars.APP_ADDRESS as `0x${string}`
  REWARDS_CONTRACT = envVars.REWARDS_CONTRACT as `0x${string}`
  
  // Initialize viem clients only if env vars are valid
  account = privateKeyToAccount(APP_PRIVATE_KEY)
} catch (error) {
  console.error('Environment variable validation failed:', error)
}

// Create clients for Celo blockchain
const publicClient = createPublicClient({ 
  chain: celo,
  transport: http()
})

// Create wallet client - will be recreated with account if env vars are valid
  //@ts-ignore
let walletClient: ReturnType<typeof createWalletClient> | null = null

// Initialize wallet client if account is available
if (account) {
  walletClient = createWalletClient({ 
    chain: celo,
    transport: http(),
    account
  })
}

// Function to initialize SDK when needed
function getEngagementRewardsSDK() {
  if (!REWARDS_CONTRACT || !walletClient) {
    throw new Error('SDK not properly configured')
  }
  
  // Version compatibility issue between viem v2.37.1 and @goodsdks/engagement-sdk v1.0.1
  // The SDK expects a different transaction type interface than the current viem version provides
  const sdk = new EngagementRewardsSDK(
    // @ts-expect-error - Suppress publicClient type mismatch
    publicClient,
    walletClient,
    REWARDS_CONTRACT
  )
  return sdk
}

// Helper function to log signature requests for auditing
async function logSignatureRequest(data: {
  app: string
  user: string
  inviter?: string
  validUntilBlock: string
  signature: string
}): Promise<void> {
  // This is a placeholder - implement your actual logging logic
  // Examples: save to database, send to logging service, etc.
  console.log('Signature request:', {
    timestamp: new Date().toISOString(),
    ...data
  })
}

export async function POST(request: Request) {
  try {
    // Check if environment variables are properly configured
    if (!APP_PRIVATE_KEY || !APP_ADDRESS || !REWARDS_CONTRACT || !account || !walletClient) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing required environment variables' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { user, validUntilBlock, inviter } = body

    // Validate required parameters
    if (!user || !validUntilBlock) {
      return NextResponse.json(
        { error: 'Missing required parameters: user and validUntilBlock are required' },
        { status: 400 }
      )
    }

    // Validate user address format
    if (!user.startsWith('0x') || user.length !== 42) {
      return NextResponse.json(
        { error: 'Invalid user address format' },
        { status: 400 }
      )
    }

    // Validate validUntilBlock is a valid number
    const blockNumber = BigInt(validUntilBlock)
    if (blockNumber <= 0) {
      return NextResponse.json(
        { error: 'validUntilBlock must be a positive number' },
        { status: 400 }
      )
    }

    // Initialize and use SDK to prepare signature data
    const engagementRewards = getEngagementRewardsSDK()
    const { domain, types, message } = await engagementRewards.prepareAppSignature(
      APP_ADDRESS,
      user as `0x${string}`,
      blockNumber
    )

    // Sign the prepared data
      //@ts-ignore
    const signature = await walletClient.signTypedData({
      account,
      domain,
      types, 
      primaryType: 'AppClaim',
      message
    })

    // Log signature request for auditing
    await logSignatureRequest({
      app: APP_ADDRESS,
      user,
      inviter: inviter || '',
      validUntilBlock,
      signature
    })

    return NextResponse.json({ 
      signature,
      message: 'Signature generated successfully'
    })

  } catch (error) {
    console.error('Error signing message:', error)
    
    // Return appropriate error message
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to sign message: ${error.message}` },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to sign message' },
      { status: 500 }
    )
  }
}

// Optional: Add GET method for health check
export async function GET() {
    //@ts-ignore
  const isConfigured = !!(APP_PRIVATE_KEY && APP_ADDRESS && REWARDS_CONTRACT && account && walletClient)
  
  return NextResponse.json({ 
    message: 'getAppSignature API endpoint is running',
    timestamp: new Date().toISOString(),
    configured: isConfigured,
    ...(isConfigured ? {} : { 
      error: 'Missing required environment variables',
      required: ['APP_PRIVATE_KEY', 'APP_ADDRESS', 'NEXT_PUBLIC_REWARDS_CONTRACT']
    })
  })
}
