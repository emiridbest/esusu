// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { electricityPaymentService } from '@esusu/backend/lib/services/electricityPaymentService';
import { TransactionService } from '@esusu/backend/lib/services/transactionService';
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import { NotificationService } from '@esusu/backend/lib/services/notificationService';
import { AnalyticsService } from '@esusu/backend/lib/services/analyticsService';

// Simple in-memory rate limiter and API key check
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = Number(process.env.ELECTRICITY_RATE_LIMIT_PER_MINUTE || process.env.TOPUP_RATE_LIMIT_PER_MINUTE || 10);
const rateMap = new Map<string, { count: number; windowStart: number }>();

function getClientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  const xr = req.headers.get('x-real-ip');
  if (xr) return xr;
  return 'unknown';
}

function rateLimit(key: string, limit = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW_MS): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    rateMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}


// SECURITY: Payment validation configuration
const CELO_RPC_URL = process.env.CELO_RPC_URL || 'https://rpc.ankr.com/celo/e1b2a5b5b759bc650084fe69d99500e25299a5a994fed30fa313ae62b5306ee8';
const RECIPIENT_WALLET = (process.env.RECIPIENT_WALLET || '0xb82896C4F251ed65186b416dbDb6f6192DFAF926');
const MIN_CONFIRMATIONS = 1;
const MAX_TRANSACTION_AGE_MINUTES = 10;

// Valid token addresses for payment validation
const VALID_TOKENS = {
  'CELO': '0x471EcE3750Da237f93B8E339c536989b8978a438', // Wrapped CELO (wCELO)
  'cUSD': '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  'USDC': '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  'USDT': '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
  'G$': '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A' // GoodDollar on Celo mainnet
};

// Token decimals mapping for accurate amount validation
const TOKEN_DECIMALS = {
  CELO: 18,
  cUSD: 18,
  USDC: 6,
  USDT: 6,
  'G$': 18
} as const;

interface PaymentValidation {
  transactionHash: string;
  expectedAmount: string;
  paymentToken: string;
  recipientAddress: string;
}

// Validate blockchain payment before processing electricity payment
async function validatePayment(validation: PaymentValidation): Promise<{ isValid: boolean; error?: string }> {
  try {
    const provider = new ethers.JsonRpcProvider(CELO_RPC_URL);
    
    // Get transaction details
    const tx = await provider.getTransaction(validation.transactionHash);
    if (!tx) {
      return { isValid: false, error: 'Transaction not found' };
    }

    // Wait for transaction confirmation with polling (max 60 seconds)
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
    const pollInterval = 2000; // 2 seconds between polls
    let receipt = null;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      receipt = await provider.getTransactionReceipt(validation.transactionHash);
      
      if (receipt) {
        // Receipt found, break out of polling loop
        break;
      }
      
      // If not the last attempt, wait before trying again
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    if (!receipt) {
      return { isValid: false, error: 'Transaction not confirmed - timeout waiting for confirmation' };
    }
    
    // Ensure transaction succeeded
    if (receipt.status !== 1) {
      return { isValid: false, error: 'On-chain transaction failed' };
    }

    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber;
    if (confirmations < MIN_CONFIRMATIONS) {
      return { isValid: false, error: 'Transaction not confirmed' };
    }

    // Validate transaction age (prevent replay attacks)
    const txBlock = await provider.getBlock(receipt.blockNumber);
    if (!txBlock) {
      return { isValid: false, error: 'Unable to fetch block for transaction' };
    }
    const txAge = (Date.now() / 1000) - txBlock.timestamp;
    if (txAge > MAX_TRANSACTION_AGE_MINUTES * 60) {
      return { isValid: false, error: 'Transaction too old' };
    }

    // Validate token contract address
    const tokenAddress = VALID_TOKENS[validation.paymentToken as keyof typeof VALID_TOKENS];
    if (!tokenAddress || tx.to?.toLowerCase() !== tokenAddress.toLowerCase()) {
      return { isValid: false, error: 'Invalid payment token' };
    }

    // Decode and validate transfer amount
    const transferInterface = new ethers.Interface([
      'function transfer(address to, uint256 value) returns (bool)'
    ]);
    
    try {
      const decoded = transferInterface.parseTransaction({ data: tx.data });
      if (decoded?.name !== 'transfer') {
        return { isValid: false, error: 'Not a token transfer transaction' };
      }

      const transferAmount = decoded.args[1];
      // Dynamically fetch token decimals with fallback
      let decimals: number;
      try {
        const erc20 = new ethers.Contract(
          tokenAddress,
          ['function decimals() view returns (uint8)'],
          provider
        );
        decimals = Number(await erc20.decimals());
      } catch {
        decimals = TOKEN_DECIMALS[validation.paymentToken as keyof typeof TOKEN_DECIMALS] ?? 18;
      }
      const expectedAmountWei = ethers.parseUnits(validation.expectedAmount, decimals);
      
      if (transferAmount < expectedAmountWei) {
        return { isValid: false, error: 'Insufficient payment amount' };
      }

      // Validate recipient in transfer data
      if (decoded.args[0].toLowerCase() !== RECIPIENT_WALLET.toLowerCase()) {
        return { isValid: false, error: 'Invalid payment recipient' };
      }

    } catch {
      return { isValid: false, error: 'Invalid transaction data' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Payment validation error:', error);
    return { isValid: false, error: 'Payment validation failed' };
  }
}

export async function POST(request: NextRequest) {
    try {

        // Basic IP rate limiting
        const ip = getClientIp(request);
        if (!rateLimit(`electricity:ip:${ip}`)) {
            return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
        }

        const body = await request.json();
        const { 
            country, 
            providerId, 
            customerId, 
            customerEmail, 
            customerPhone, 
            amount, 
            transactionHash, 
            expectedAmount, 
            paymentToken 
        } = body;

        // Validate required fields
        if (!country || !providerId || !customerId || !customerEmail || !amount) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: country, providerId, customerId, customerEmail, amount' },
                { status: 400 }
            );
        }

        // SECURITY: Require payment validation for all electricity payments
        if (!transactionHash || !expectedAmount || !paymentToken) {
            return NextResponse.json(
                { success: false, error: 'Payment validation required - missing transaction hash, amount, or token' },
                { status: 400 }
            );
        }

        console.log(`Processing electricity payment:`, { country, providerId, customerId, amount, transactionHash });

        // SECURITY: Enforce hash replay protection early (idempotency)
        const hashUsed = await TransactionService.isPaymentHashUsed(transactionHash);
        if (hashUsed) {
            return NextResponse.json(
                { success: false, error: 'Transaction hash already used' },
                { status: 409 }
            );
        }

        // SECURITY: Validate blockchain payment before processing payment
        const paymentValidation = await validatePayment({
            transactionHash,
            expectedAmount,
            paymentToken,
            recipientAddress: RECIPIENT_WALLET
        });

        if (!paymentValidation.isValid) {
            console.error('Payment validation failed:', paymentValidation.error);
            return NextResponse.json(
                { success: false, error: `Payment validation failed: ${paymentValidation.error}` },
                { status: 403 }
            );
        }

        // Extract wallet address from transaction
        const provider = new ethers.JsonRpcProvider(CELO_RPC_URL);
        const tx = await provider.getTransaction(transactionHash);
        const walletAddress = tx?.from;

        if (!walletAddress) {
            return NextResponse.json(
                { success: false, error: 'Could not determine wallet address from transaction' },
                { status: 400 }
            );
        }

        // Per-wallet rate limiting
        if (!rateLimit(`electricity:wallet:${walletAddress}`)) {
            return NextResponse.json({ success: false, error: 'Too many requests for wallet' }, { status: 429 });
        }

        // Generate unique request reference
        const requestReference = `ELEC_${Date.now()}_${uuidv4().slice(0, 8)}`;

        // Record transaction in database as pending (also records hash as used)
        let transaction: any;
        try {
            transaction = await TransactionService.createTransaction({
                walletAddress,
                transactionHash,
                type: 'utility_payment',
                subType: 'electricity',
                amount: parseFloat(expectedAmount),
                token: paymentToken,
                utilityDetails: {
                    recipient: customerId.trim(),
                    provider: providerId.toString(),
                    country: country.trim().toLowerCase(),
                    metadata: { customerEmail: customerEmail.trim(), customerPhone: customerPhone?.trim() || customerEmail, requestReference }
                }
            });
        } catch (dbErr) {
            console.error('Failed to record electricity transaction:', dbErr);
            return NextResponse.json(
                { success: false, error: 'Database error during transaction recording' },
                { status: 500 }
            );
        }

        // Process electricity payment with provider
        const paymentResult = await electricityPaymentService.processPayment({
            country: country.trim().toLowerCase(),
            providerId: providerId.toString(),
            customerId: customerId.trim(),
            customerEmail: customerEmail.trim(),
            customerPhone: customerPhone?.trim() || customerEmail,
            amount: parseFloat(amount),
            requestReference
        });

        if (paymentResult.success) {
            await TransactionService.updateTransactionStatus(transactionHash, 'completed');

            // Update user email/phone if provided (for receipt delivery)
            try {
                if (customerEmail) {
                    await UserService.updateUserProfile(walletAddress, { email: customerEmail });
                }
                if (customerPhone) {
                    await UserService.updateUserProfile(walletAddress, { phone: customerPhone });
                }
            } catch (profileUpdateError) {
                console.warn('Failed to update user profile:', profileUpdateError);
            }

            // Send success notification with email/SMS
            let emailSent = false;
            let smsSent = false;
            try {
                const notification = await NotificationService.sendUtilityPaymentNotification(
                    walletAddress,
                    true,
                    {
                        type: 'electricity',
                        amount: parseFloat(expectedAmount),
                        recipient: customerId.trim(),
                        transactionHash
                    }
                );
                
                // Check if email/SMS was sent from notification channels
                emailSent = notification.channels?.email?.sent || false;
                smsSent = notification.channels?.sms?.sent || false;
            } catch (notificationError) {
                console.error('Notification sending error:', notificationError);
            }

            // Generate/update analytics
            try {
                await AnalyticsService.generateUserAnalytics(walletAddress, 'daily');
                await AnalyticsService.generateUserAnalytics(walletAddress, 'monthly');
            } catch (analyticsError) {
                console.error('Analytics generation error:', analyticsError);
            }

            return NextResponse.json({
                success: true,
                transactionRef: paymentResult.transactionRef,
                approvedAmount: paymentResult.approvedAmount,
                token: paymentResult.token,
                units: paymentResult.units,
                emailSent,
                smsSent,
                message: `Electricity bill payment of ${paymentResult.approvedAmount} processed successfully${paymentResult.token ? `. Token: ${paymentResult.token}` : ''}`
            });
        } else {
            await TransactionService.updateTransactionStatus(transactionHash, 'failed');

            // Send failure notification
            await NotificationService.sendUtilityPaymentNotification(
                walletAddress,
                false,
                {
                    type: 'electricity',
                    amount: parseFloat(expectedAmount) || parseFloat(amount),
                    recipient: customerId.trim(),
                    transactionHash
                }
            );

            return NextResponse.json({
                success: false,
                error: paymentResult.error || 'Payment processing failed',
                transactionRef: paymentResult.transactionRef
            }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Error processing electricity payment:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Payment service temporarily unavailable',
                details: error.message 
            },
            { status: 500 }
        );
    }
}
