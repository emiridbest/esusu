# Gasless Transaction System - Usage Guide

## Overview

The gasless transaction system automatically checks if users have sufficient CELO for gas fees and sponsors the exact amount needed when they don't. This creates a seamless user experience where users with only stablecoins can still interact with the platform.

## Features

- ✅ **Automatic Gas Checking**: Simulates transactions to calculate exact gas requirements
- ✅ **Conditional Sponsorship**: Only sponsors when user genuinely needs gas
- ✅ **Rate Limiting**: Prevents abuse with daily limits and cooldown periods
- ✅ **Transaction Tracking**: Complete audit trail of all sponsorships
- ✅ **Admin Monitoring**: Real-time stats and backend wallet health

## Quick Start

### 1. Environment Setup

Add these environment variables to your `.env.local`:

```env
# Required
BACKEND_WALLET_PRIVATE_KEY=0x...  # Wallet that will sponsor gas
MONGODB_URI=mongodb://...          # MongoDB connection string

# Optional (with defaults)
GAS_SPONSORSHIP_DAILY_LIMIT_PER_USER=10
GAS_SPONSORSHIP_MAX_AMOUNT_CELO=0.1
GAS_SPONSORSHIP_COOLDOWN_MINUTES=5
GAS_SPONSORSHIP_LOW_BALANCE_THRESHOLD=100
```

### 2. Basic Usage

```typescript
import { useGasSponsorship } from '@/hooks/useGasSponsorship';
import { useAccount } from 'wagmi';

function MyComponent() {
  const { address } = useAccount();
  const { checkAndSponsor, isChecking } = useGasSponsorship();

  const handleTransaction = async () => {
    // Step 1: Check and sponsor gas if needed
    const result = await checkAndSponsor(address!, {
      contractAddress: '0xYourContractAddress',
      abi: YOUR_CONTRACT_ABI,
      functionName: 'deposit',
      args: [parseEther('10')],
    });

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    // Show sponsorship notification
    if (result.gasSponsored) {
      toast.success(`Gas sponsored! ${result.amountSponsored} CELO added to your wallet.`);
    }

    // Step 2: Execute your transaction
    const hash = await writeContract({
      address: '0xYourContractAddress',
      abi: YOUR_CONTRACT_ABI,
      functionName: 'deposit',
      args: [parseEther('10')],
    });
  };

  return (
    <button onClick={handleTransaction} disabled={isChecking}>
      {isChecking ? 'Checking gas...' : 'Deposit'}
    </button>
  );
}
```

## API Endpoints

### POST /api/gas/estimate

Estimate gas for a transaction without sponsoring.

**Request:**
```typescript
{
  userAddress: "0x...",
  contractAddress: "0x...",
  abi: [...],
  functionName: "deposit",
  args: [...]
}
```

**Response:**
```typescript
{
  success: true,
  gasEstimate: {
    gasLimit: "50000",
    maxFeePerGas: "1000000000",
    maxPriorityFeePerGas: "1000000",
    totalCostWei: "50000000000000",
    totalCostCELO: "0.00005"
  }
}
```

### POST /api/gas/check-and-sponsor

Check balance and sponsor if needed.

**Request:**
```typescript
{
  userAddress: "0x...",
  contractAddress: "0x...",
  abi: [...],
  functionName: "contribute",
  args: [groupId, amount]
}
```

**Response:**
```typescript
{
  success: true,
  userHadSufficientGas: false,
  gasSponsored: true,
  amountSponsored: "0.00005",
  sponsorshipTxHash: "0x...",
  gasEstimate: {
    gasLimit: "50000",
    totalCost: "0.00005"
  },
  message: "Gas sponsored successfully! 0.00005 CELO sent to your wallet."
}
```

### GET /api/gas/stats

Get sponsorship statistics (admin).

**Response:**
```typescript
{
  success: true,
  stats: {
    totalSponsored: 0.5,        // Total CELO sponsored
    totalCount: 15,             // Number of sponsorships
    uniqueUsers: 8,             // Unique user count
    averageAmount: 0.033,       // Average per sponsorship
    periodDays: 7
  },
  backendWallet: {
    address: "0x...",
    balance: "150000000000000000000",
    balanceCELO: "150.0",
    isLow: false                // True if below threshold
  }
}
```

## React Hook API

### useGasSponsorship()

```typescript
const {
  // Functions
  estimateGas,           // (address, params) => Promise<GasEstimate>
  checkAndSponsor,       // (address, params) => Promise<SponsorshipResult>
  getSponsorshipHistory, // (address, limit?) => Promise<History[]>
  getCurrentGasPrices,   // () => Promise<GasPrices>
  
  // State
  isChecking,           // boolean - checking/sponsoring in progress
  isEstimating,         // boolean - estimating gas
  error,                // Error | null
} = useGasSponsorship();
```

## Error Handling

### Rate Limit Exceeded (429)

```typescript
const result = await checkAndSponsor(address, params);

if (result.error?.includes('limit')) {
  toast.error('You have reached your daily gas sponsorship limit. Please try again tomorrow.');
}
```

### Service Unavailable (503)

```typescript
if (result.error?.includes('unavailable')) {
  toast.error('Gas sponsorship service is temporarily unavailable. Please try again later.');
}
```

### Transaction Simulation Failed

```typescript
if (result.error?.includes('execution reverted')) {
  toast.error('Transaction would fail. Please check your parameters.');
}
```

## Integration Examples

### Example 1: MiniSafe Deposit

```typescript
import { useGasSponsorship } from '@/hooks/useGasSponsorship';

const handleDeposit = async (amount: bigint, lockTime: number) => {
  const sponsorResult = await checkAndSponsor(address!, {
    contractAddress: MINISAFE_ADDRESS,
    abi: MINISAFE_ABI,
    functionName: 'deposit',
    args: [amount, lockTime],
  });

  if (!sponsorResult.success) {
    setError(sponsorResult.message);
    return;
  }

  // Notify user if gas was sponsored
  if (sponsorResult.gasSponsored) {
    toast.success(`Gas sponsored! ${sponsorResult.amountSponsored} CELO`);
  }

  // Execute deposit
  await writeContract({
    address: MINISAFE_ADDRESS,
    abi: MINISAFE_ABI,
    functionName: 'deposit',
    args: [amount, lockTime],
  });
};
```

### Example 2: Thrift Contribution

```typescript
const handleContribute = async (groupId: number, amount: bigint) => {
  // Check and sponsor gas
  const sponsorResult = await checkAndSponsor(address!, {
    contractAddress: THRIFT_ADDRESS,
    abi: THRIFT_ABI,
    functionName: 'contribute',
    args: [groupId, amount],
  });

  if (!sponsorResult.success) {
    if (sponsorResult.error?.includes('limit')) {
      toast.error('Daily gas limit reached. Try again tomorrow.');
    } else {
      toast.error(sponsorResult.message);
    }
    return;
  }

  // Show sponsorship info
  if (sponsorResult.gasSponsored) {
    toast.info(`Gas fee covered: ${sponsorResult.amountSponsored} CELO`);
  }

  // Make contribution
  await writeContract({
    address: THRIFT_ADDRESS,
    abi: THRIFT_ABI,
    functionName: 'contribute',
    args: [groupId, amount],
  });
};
```

### Example 3: With Loading States

```typescript
function TransactionButton() {
  const { checkAndSponsor, isChecking } = useGasSponsorship();
  const [txStatus, setTxStatus] = useState<'idle' | 'checking' | 'executing'>('idle');

  const handleClick = async () => {
    try {
      // Phase 1: Check gas
      setTxStatus('checking');
      const result = await checkAndSponsor(address!, params);
      
      if (!result.success) {
        setTxStatus('idle');
        return;
      }

      // Phase 2: Execute transaction
      setTxStatus('executing');
      await executeTransaction();
      
      toast.success('Transaction completed!');
    } catch (error) {
      toast.error('Transaction failed');
    } finally {
      setTxStatus('idle');
    }
  };

  return (
    <button onClick={handleClick} disabled={txStatus !== 'idle'}>
      {txStatus === 'checking' && 'Checking gas...'}
      {txStatus === 'executing' && 'Executing...'}
      {txStatus === 'idle' && 'Submit Transaction'}
    </button>
  );
}
```

## Rate Limiting

### Default Limits

- **Daily limit**: 10 sponsorships per user
- **Max amount**: 0.1 CELO per transaction
- **Cooldown**: 5 minutes between sponsorships

### Check User's Sponsorship History

```typescript
const history = await getSponsorshipHistory(address, 10);

console.log(`User has received ${history.length} sponsorships`);
history.forEach(s => {
  console.log(`${s.amountCELO} CELO on ${s.createdAt}`);
});
```

## Monitoring

### Backend Wallet Health

```typescript
// Admin route to check wallet balance
fetch('/api/gas/stats')
  .then(r => r.json())
  .then(data => {
    if (data.backendWallet.isLow) {
      alert('Backend wallet balance is low! Please refill.');
    }
  });
```

### Sponsorship Analytics

```typescript
// Get 7-day stats
const stats = await fetch('/api/gas/stats?days=7').then(r => r.json());

console.log(`Total sponsored: ${stats.stats.totalSponsored} CELO`);
console.log(`Unique users: ${stats.stats.uniqueUsers}`);
console.log(`Average: ${stats.stats.averageAmount} CELO`);
```

## Troubleshooting

### "Backend wallet private key required"

Make sure `BACKEND_WALLET_PRIVATE_KEY` is set in your environment variables.

### "Daily sponsorship limit reached"

User has exceeded 10 sponsorships in 24 hours. They need to wait until the next day.

### "Gas sponsorship service temporarily unavailable"

Backend wallet has insufficient balance to sponsor. Refill the backend wallet with CELO.

### Transaction simulation fails

The transaction would revert. Check:
- Contract address is correct
- Function parameters are valid
- User has necessary token balances (e.g., tokens to deposit)

## Security

- ✅ Rate limiting prevents abuse
- ✅ Amount caps limit maximum sponsorship
- ✅ Cooldown periods prevent rapid-fire requests
- ✅ Complete audit trail in database
- ✅ Backend wallet balance monitoring

## Support

For issues or questions, please refer to the implementation plan or contact the development team.
