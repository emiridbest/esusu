import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import dbConnect from '@esusu/backend/lib/database/connection';
import { TransactionService } from '@esusu/backend/lib/services/transactionService';
import { NotificationService } from '@esusu/backend/lib/services/notificationService';
import { AnalyticsService } from '@esusu/backend/lib/services/analyticsService';
import { UserService } from '@esusu/backend/lib/services/userService';


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


// Payment validation configuration
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
  // GoodDollar (G$) on Celo mainnet – used for freebies flow
  'G$':   '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A'
} as const;

// Token decimals mapping for accurate amount validation
const TOKEN_DECIMALS = {
  CELO: 18,
  cUSD: 18,
  USDC: 6,
  USDT: 6,
  'G$': 18,
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
    'Accept': process.env.NEXT_PUBLIC_ACCEPT_HEADER || 'application/com.reloadly.topups-v1+json',
    ...options.headers
  };

  const url = `${API_URL}${endpoint}`;
  console.log('Reloadly API Request:', {
    url,
    method: options.method || 'GET',
    body: options.body ? JSON.parse(options.body) : undefined
  });

  const response = await fetch(url, {
    ...options,
    headers
  });

  console.log('Reloadly API Response Status:', response.status, response.statusText);

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
      console.error('Reloadly API Error Response:', errorData);
      throw new Error(errorData.message || `API request failed: ${response.status}`);
    } catch (parseError) {
      console.error('Reloadly API Error (no JSON):', response.status, response.statusText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
  }

  const responseData = await response.json();
  console.log('Reloadly API Success Response:', responseData);
  return responseData;
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

  // Format request body according to Reloadly API specification
  const requestBody: any = {
    operatorId: parseInt(params.operatorId),
    amount: parseFloat(params.amount), // Always send as number (Reloadly accepts both number and string)
    useLocalAmount: !!params.useLocalAmount,
    customIdentifier: params.customId,
    recipientPhone: {
      countryCode: params.recipientPhone.country || params.recipientPhone.countryCode || '',
      number: params.recipientPhone.phoneNumber || params.recipientPhone.number || ''
    }
  };

  // Only add optional fields if they have values (Reloadly prefers omission over null)
  if (params.recipientEmail) {
    requestBody.recipientEmail = params.recipientEmail;
  }

  console.log('Making Reloadly top-up request:', {
    operatorId: requestBody.operatorId,
    amount: requestBody.amount,
    useLocalAmount: requestBody.useLocalAmount,
    recipientCountry: requestBody.recipientPhone.countryCode,
    customId: params.customId
  });

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

    // Wait for transaction confirmation with polling (max 60 seconds)
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
    const pollInterval = 2000; // 2 seconds between polls
    let receipt = null;
    let confirmations = 0;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      receipt = await provider.getTransactionReceipt(validation.transactionHash);
      
      if (receipt) {
        // Receipt found, now check confirmations
        if (receipt.status !== 1) {
          return { isValid: false, error: 'On-chain transaction failed' };
        }
        
        const currentBlock = await provider.getBlockNumber();
        confirmations = currentBlock - receipt.blockNumber;
        
        // If we have enough confirmations, break out of polling loop
        if (confirmations >= MIN_CONFIRMATIONS) {
          break;
        }
        
        console.log(`Transaction found in block ${receipt.blockNumber}, current block ${currentBlock}, confirmations: ${confirmations}/${MIN_CONFIRMATIONS}`);
      }
      
      // If not the last attempt, wait before trying again
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    if (!receipt) {
      return { isValid: false, error: 'Transaction not confirmed - timeout waiting for confirmation' };
    }
    
    // Final confirmation check
    if (confirmations < MIN_CONFIRMATIONS) {
      return { isValid: false, error: `Transaction needs ${MIN_CONFIRMATIONS} confirmation(s), currently has ${confirmations}` };
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
  let body: any;
  let walletAddress: string | undefined;
  
  try {

    // Basic IP rate limiting
    const ip = getClientIp(request);
    if (!rateLimit(`topup:ip:${ip}`)) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    // Parse request body with explicit error handling
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid request body - must be valid JSON' },
        { status: 400 }
      );
    }
    const { 
      operatorId, 
      amount, 
      recipientPhone, 
      email, 
      transactionHash, 
      expectedAmount, 
      paymentToken,
      serviceType,
      type 
    } = body;
    
    
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

    // Validate expectedAmount is a valid number
    const parsedAmount = parseFloat(expectedAmount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: `Invalid payment amount: ${expectedAmount}` },
        { status: 400 }
      );
    }

    // SECURITY: Enforce hash replay protection early (idempotency)
    try {
      await dbConnect();
    } catch (dbConnectError: any) {
      console.error('Database connection failed:', dbConnectError);
      return NextResponse.json(
        { success: false, error: 'Database connection failed. Please try again.' },
        { status: 503 }
      );
    }
    
    const hashUsed = await TransactionService.isPaymentHashUsed(transactionHash);
    if (hashUsed) {
      return NextResponse.json(
        { success: false, error: 'Transaction hash already used' },
        { status: 409 }
      );
    }

    // SECURITY: Validate blockchain payment before processing top-up
    console.log('Validating payment transaction:', transactionHash);
    let paymentValidation;
    try {
      paymentValidation = await validatePayment({
        transactionHash,
        expectedAmount,
        paymentToken,
        recipientAddress: RECIPIENT_WALLET
      });
    } catch (validationError: any) {
      console.error('Payment validation error:', validationError);
      return NextResponse.json(
        { success: false, error: `Payment validation error: ${validationError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    if (!paymentValidation.isValid) {
      console.error('Payment validation failed:', paymentValidation.error);
      return NextResponse.json(
        { success: false, error: `Payment validation failed: ${paymentValidation.error}` },
        { status: 403 }
      );
    }

    console.log('Payment validated successfully, processing top-up...');

    // Extract wallet address from transaction
    let provider;
    let tx;
    try {
      provider = new ethers.JsonRpcProvider(CELO_RPC_URL);
      tx = await provider.getTransaction(transactionHash);
    } catch (rpcError: any) {
      console.error('RPC error fetching transaction:', rpcError);
      return NextResponse.json(
        { success: false, error: `Failed to fetch transaction from blockchain: ${rpcError?.message || 'RPC error'}` },
        { status: 503 }
      );
    }
    
    walletAddress = tx?.from;

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
      // Determine subType based on serviceType/type (if provided) or operatorId
      let subType: 'airtime' | 'data' | 'electricity' | 'cable';
      
      // Use serviceType (from context) or type (from components) if explicitly provided
      const transactionType = serviceType || type;
      if (transactionType === 'airtime') {
        subType = 'airtime';
      } else if (transactionType === 'data') {
        subType = 'data';
      } else {
        // Fall back to operatorId-based detection
        const operatorIdLower = String(operatorId).toLowerCase();
        
        if (operatorIdLower.includes('airtime') || operatorIdLower.includes('mobile-topup')) {
          subType = 'airtime';
        } else if (operatorIdLower.includes('data') || operatorIdLower.includes('data-bundle')) {
          subType = 'data';
        } else if (operatorIdLower.includes('cable') || operatorIdLower.includes('tv') || operatorIdLower.includes('cabletv')) {
          subType = 'cable';
        } else {
          // Default to 'electricity' only for actual electricity payments
          // This topup route should primarily handle airtime/data, so electricity might be unexpected here
          subType = 'electricity';
        }
      }
      
      // Record transaction in database
      const transactionData = {
        walletAddress,
        transactionHash,
        type: 'utility_payment' as const,
        subType: subType as any,
        amount: parsedAmount,
        token: paymentToken,
        utilityDetails: {
          recipient: recipientPhone.phoneNumber,
          provider: operatorId,
          country: recipientPhone.country,
          metadata: { email, useLocalAmount: true }
        }
      };
      
      const transaction = await TransactionService.createTransaction(transactionData);

      // Clean and format phone number (remove spaces, dashes, etc.)
      const cleanedPhoneNumber = recipientPhone.phoneNumber.replace(/[\s\-\+]/g, '');
      
      // Make the top-up request
      let result;
      try {
        result = await makeTopup({
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
      } catch (topupError: any) {
        console.error('Reloadly top-up request failed:', topupError);
        // Mark transaction as failed
        try {
          await TransactionService.updateTransactionStatus(transactionHash, 'failed');
        } catch (statusErr) {
          console.error('Failed to update transaction status:', statusErr);
        }
        
        // Send failure notification
        try {
          await NotificationService.sendUtilityPaymentNotification(
            walletAddress,
            false,
            {
              type: 'utility',
              amount: parsedAmount,
              recipient: recipientPhone.phoneNumber,
              paymentToken
            }
          );
        } catch (notifErr) {
          console.error('Failed to send failure notification:', notifErr);
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: `Top-up service error: ${topupError?.message || 'Failed to process top-up with provider'}`,
            details: topupError?.response?.data || topupError?.message
          },
          { status: 502 }
        );
      }

      // Update transaction status
      await TransactionService.updateTransactionStatus(
        transactionHash,
        'completed'
      );

      // Update user email/phone if provided (for receipt delivery)
      try {
        if (email) {
          await UserService.updateUserProfile(walletAddress, { email: email });
        }
        if (recipientPhone?.phoneNumber) {
          await UserService.updateUserProfile(walletAddress, { phone: recipientPhone.phoneNumber });
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
            type: operatorId.includes('airtime') ? 'airtime' : 'data',
            amount: parsedAmount,
            recipient: cleanedPhoneNumber,
            transactionHash,
            paymentToken
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
        // Don't fail the transaction for analytics errors
      }

      return NextResponse.json({
        success: true,
        transactionId: result.transactionId,
        dbTransactionId: (transaction as any)._id,
        status: result.status,
        emailSent,
        smsSent,
        message: 'Top-up successful and recorded'
      });

    } catch (dbError: any) {
      console.error('Database error during top-up:', dbError);
      
      // Send failure notification (best effort)
      if (walletAddress) {
        try {
          await NotificationService.sendUtilityPaymentNotification(
            walletAddress,
            false,
            {
              type: 'utility',
              amount: parsedAmount || 0,
              recipient: recipientPhone.phoneNumber,
              paymentToken
            }
          );
        } catch (notifErr) {
          console.error('Failed to send failure notification:', notifErr);
        }
      }
      
      // Mark transaction as failed for visibility
      try {
        await TransactionService.updateTransactionStatus(transactionHash, 'failed');
      } catch (statusErr) {
        console.error('Failed to update transaction status to failed:', statusErr);
      }

      // Provide detailed validation error information
      const validationErrors = dbError?.errors ? Object.keys(dbError.errors).map(key => ({
        field: key,
        message: dbError.errors[key].message
      })) : [];

      return NextResponse.json(
        { 
          success: false, 
          error: `Database error: ${dbError?.message || 'Failed to record transaction'}`,
          details: dbError?.message,
          validationErrors: validationErrors.length > 0 ? validationErrors : undefined
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error processing top-up:', error);
    console.error('Error stack:', error?.stack);

    // Ensure we always return a proper error structure
    const errorMessage = error?.message || error?.toString() || 'An unexpected error occurred while processing your top-up';
    const errorDetails = {
      message: errorMessage,
      type: error?.name || 'UnknownError',
      code: error?.code
    };

    // Handle different error types with detailed logging
    if (error.response?.data) {
      console.error('Reloadly API error response:', error.response.data);
      return NextResponse.json(
        {
          success: false,
          error: error.response.data.message || errorMessage,
          details: error.response.data
        },
        { status: error.response.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}