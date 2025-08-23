import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import dbConnect from '../../../../backend/lib/database/connection';
import { TransactionService } from '../../../../backend/lib/services/transactionService';
import { NotificationService } from '../../../../backend/lib/services/notificationService';
import { AnalyticsService } from '../../../../backend/lib/services/analyticsService';


// Rate limiting and API key configuration
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = Number(process.env.TOPUP_RATE_LIMIT_PER_MINUTE || 10);
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

function requireApiKey(req: NextRequest): { ok: boolean; error?: string } {
  const required = process.env.PAYMENT_API_KEY || process.env.API_KEY;
  if (!required) return { ok: true };
  const header = req.headers.get('x-api-key') || (req.headers.get('authorization')?.replace(/^Bearer\s+/i, ''));
  if (!header || header !== required) return { ok: false, error: 'Unauthorized' };
  return { ok: true };
}

// Payment validation configuration
const CELO_RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo.org';
const RECIPIENT_WALLET = (process.env.RECIPIENT_WALLET || '0xb82896C4F251ed65186b416dbDb6f6192DFAF926');
const MIN_CONFIRMATIONS = 1;
const MAX_TRANSACTION_AGE_MINUTES = 10;

// Valid token addresses for payment validation
const VALID_TOKENS = {
  'cUSD': '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  'USDC': '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  'USDT': '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e'
};

// Token decimals mapping for accurate amount validation
const TOKEN_DECIMALS = {
  cUSD: 18,
  USDC: 6,
  USDT: 6
} as const;

// Reloadly API configuration
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL;
const SANDBOX_API_URL = process.env.NEXT_PUBLIC_SANDBOX_API_URL;
const PRODUCTION_API_URL = process.env.NEXT_PUBLIC_API_URL;
const isSandbox = process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true';
const API_URL = isSandbox ? SANDBOX_API_URL : PRODUCTION_API_URL;

// Token cache for Reloadly API
const tokenCache = {
  token: '',
  expiresAt: 0
};

interface PaymentValidation {
  transactionHash: string;
  expectedAmount: string;
  paymentToken: string;
  recipientAddress: string;
}

// Get OAuth 2.0 access token from Reloadly
async function getAccessToken(): Promise<string> {
  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  try {
    const clientId = process.env.NEXT_CLIENT_ID;
    const clientSecret = process.env.NEXT_CLIENT_SECRET;

    if (!clientId || !clientSecret || !AUTH_URL) {
      throw new Error('Reloadly API credentials not configured');
    }

    const audience = isSandbox ? process.env.NEXT_PUBLIC_SANDBOX_API_URL : process.env.NEXT_PUBLIC_API_URL;
    if (!audience) {
      throw new Error('API configuration missing');
    }

    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        audience: audience
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Authentication error response:', errorText);
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const expiresIn = data.expires_in || 3600;
    tokenCache.token = data.access_token;
    tokenCache.expiresAt = Date.now() + (expiresIn * 1000) - 60000;

    return tokenCache.token;
  } catch (error) {
    console.error('Error getting Reloadly access token:', error);
    throw new Error('Failed to authenticate with Reloadly API');
  }
}

// Make authenticated API request to Reloadly
async function apiRequest(endpoint: string, options: any = {}) {
  const token = await getAccessToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      console.error('API request failed:', errorData);
      throw new Error(errorData.message || `API request failed: ${response.status}`);
    } catch (parseError) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
  }

  return response.json();
}

// Make a top-up request to Reloadly API
async function makeTopup(params: {
  operatorId: string;
  amount: string;
  customId: string;
  useLocalAmount?: boolean;
  recipientEmail?: string;
  recipientPhone: {
    country?: string;
    countryCode?: string;
    phoneNumber?: string;
    number?: string;
  };
}) {
  if (!params.operatorId || !params.amount || !params.customId || !params.recipientPhone) {
    throw new Error('Missing required fields for top-up');
  }

  const requestBody = {
    operatorId: parseInt(params.operatorId),
    amount: params.useLocalAmount ? parseFloat(params.amount) : null,
    useLocalAmount: !!params.useLocalAmount,
    recipientEmail: params.recipientEmail || null,
    customIdentifier: params.customId,
    recipientPhone: {
      countryCode: params.recipientPhone.country || params.recipientPhone.countryCode || '',
      number: params.recipientPhone.phoneNumber || params.recipientPhone.number || ''
    },
    senderPhone: null
  };

  return await apiRequest('/topups', {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });
}

// Validate blockchain payment before processing top-up
async function validatePayment(validation: PaymentValidation): Promise<{ isValid: boolean; error?: string }> {
  try {
    const provider = new ethers.JsonRpcProvider(CELO_RPC_URL);
    
    // Get transaction details
    const tx = await provider.getTransaction(validation.transactionHash);
    if (!tx) {
      return { isValid: false, error: 'Transaction not found' };
    }

    // Check if transaction is confirmed using receipt
    const receipt = await provider.getTransactionReceipt(validation.transactionHash);
    if (!receipt) {
      return { isValid: false, error: 'Transaction not confirmed' };
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
    // Optional API key auth
    const auth = requireApiKey(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    // Basic IP rate limiting
    const ip = getClientIp(request);
    if (!rateLimit(`topup:ip:${ip}`)) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { 
      operatorId, 
      amount, 
      recipientPhone, 
      email, 
      transactionHash, 
      expectedAmount, 
      paymentToken 
    } = body;
    
    console.log('Top-up request body:', { operatorId, amount, recipientPhone, email, transactionHash });
    
    // SECURITY: Validate required fields including payment proof
    if (!operatorId || !amount || !recipientPhone || !recipientPhone.country || !recipientPhone.phoneNumber) {
      console.error('Missing required fields:', { operatorId, amount, recipientPhone });
      return NextResponse.json(
        { success: false, error: 'Missing required fields for top-up transaction' },
        { status: 400 }
      );
    }

    // SECURITY: Require payment validation for all top-ups
    if (!transactionHash || !expectedAmount || !paymentToken) {
      console.error('Missing payment validation fields:', { transactionHash, expectedAmount, paymentToken });
      return NextResponse.json(
        { success: false, error: 'Payment validation required - missing transaction hash, amount, or token' },
        { status: 400 }
      );
    }

    // SECURITY: Enforce hash replay protection early (idempotency)
    await dbConnect();
    const hashUsed = await TransactionService.isPaymentHashUsed(transactionHash);
    if (hashUsed) {
      return NextResponse.json(
        { success: false, error: 'Transaction hash already used' },
        { status: 409 }
      );
    }

    // SECURITY: Validate blockchain payment before processing top-up
    console.log('Validating payment transaction:', transactionHash);
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

    console.log('Payment validated successfully, processing top-up...');

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
    if (!rateLimit(`topup:wallet:${walletAddress}`)) {
      return NextResponse.json({ success: false, error: 'Too many requests for wallet' }, { status: 429 });
    }

    try {
      // Record transaction in database
      const transaction = await TransactionService.createTransaction({
        walletAddress,
        transactionHash,
        type: 'utility_payment',
        subType: (operatorId.includes('airtime') ? 'airtime' : 
                 operatorId.includes('data') ? 'data' : 'electricity') as any,
        amount: parseFloat(expectedAmount),
        token: paymentToken,
        utilityDetails: {
          recipient: recipientPhone.phoneNumber,
          provider: operatorId,
          country: recipientPhone.country,
          metadata: { email, useLocalAmount: true }
        }
      });

      console.log('Transaction recorded in database:', (transaction as any)._id);

      // Clean and format phone number (remove spaces, dashes, etc.)
      const cleanedPhoneNumber = recipientPhone.phoneNumber.replace(/[\s\-\+]/g, '');
      
      // Make the top-up request
      const result = await makeTopup({
        operatorId,
        amount,
        customId: transactionHash,
        recipientPhone: {
          country: recipientPhone.country,
          phoneNumber: cleanedPhoneNumber
        },
        recipientEmail: email,
        useLocalAmount: true
      });

      // Update transaction status
      await TransactionService.updateTransactionStatus(
        transactionHash,
        'completed'
      );

      // Send success notification
      await NotificationService.sendUtilityPaymentNotification(
        walletAddress,
        true,
        {
          type: transaction.subType || 'utility',
          amount: parseFloat(expectedAmount),
          recipient: cleanedPhoneNumber,
          transactionHash
        }
      );

      // Generate/update analytics
      try {
        await AnalyticsService.generateUserAnalytics(walletAddress, 'daily');
        await AnalyticsService.generateUserAnalytics(walletAddress, 'monthly');
      } catch (analyticsError: any) {
        console.error('Analytics generation error:', analyticsError);
        // Don't fail the transaction for analytics errors
      }

      return NextResponse.json({
        success: true,
        transactionId: result.transactionId,
        dbTransactionId: (transaction as any)._id,
        status: result.status,
        message: 'Top-up successful and recorded'
      });

    } catch (dbError) {
      console.error('Database error during top-up:', dbError);
      
      // Send failure notification
      await NotificationService.sendUtilityPaymentNotification(
        walletAddress,
        false,
        {
          type: 'utility',
          amount: parseFloat(expectedAmount),
          recipient: recipientPhone.phoneNumber
        }
      );
      // Mark transaction as failed for visibility
      try {
        await TransactionService.updateTransactionStatus(transactionHash, 'failed');
      } catch (statusErr) {
        console.error('Failed to update transaction status to failed:', statusErr);
      }

      return NextResponse.json(
        { success: false, error: 'Database error during transaction recording' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error processing top-up:', error);

    // Handle different error types with detailed logging
    if (error.response?.data) {
      console.error('Reloadly API error:', error.response.data);
      return NextResponse.json(
        {
          success: false,
          error: error.response.data.message || 'Failed to process topup',
          details: error.response.data
        },
        { status: error.response.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process topup'
      },
      { status: 500 }
    );
  }
}