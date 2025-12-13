# Gasless Transaction System - Testing Guide

## Overview

This guide covers how to test the gasless transaction system to ensure it works correctly before deploying to production.

## Prerequisites

Before testing, ensure you have:
- [ ] MongoDB connection set up
- [ ] Backend wallet funded with CELO (testnet or mainnet)
- [ ] `BACKEND_WALLET_PRIVATE_KEY` environment variable set
- [ ] Test user wallets (with and without gas)

## Environment Setup

### For Testnet (Alfajores)

```env
# .env.local
BACKEND_WALLET_PRIVATE_KEY=0x...
MONGODB_URI=mongodb://...
CELO_RPC_URL=https://alfajores-forno.celo-testnet.org

# Sponsorship limits (more lenient for testing)
GAS_SPONSORSHIP_DAILY_LIMIT_PER_USER=20
GAS_SPONSORSHIP_MAX_AMOUNT_CELO=0.5
GAS_SPONSORSHIP_COOLDOWN_MINUTES=1
```

### For Local Testing

If you want to test locally with a local blockchain:

```bash
# Run a local Celo node or use Hardhat/Ganache
npx hardhat node --fork https://forno.celo.org
```

## Manual Testing Scenarios

### Test 1: User with Sufficient Gas

**Setup:**
- User wallet: 1 CELO balance
- Contract: Simple deposit function

**Steps:**
1. Call `/api/gas/check-and-sponsor` with user details
2. **Expected**: `gasSponsored: false`, `userHadSufficientGas: true`
3. No CELO transfer should occur

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/gas/check-and-sponsor \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0xUSER_WITH_GAS",
    "contractAddress": "0xCONTRACT_ADDRESS",
    "abi": [...],
    "functionName": "deposit",
    "args": ["1000000000000000000"]
  }'
```

---

### Test 2: User with Insufficient Gas

**Setup:**
- User wallet: 0.0001 CELO (insufficient)
- Required gas: ~0.001 CELO

**Steps:**
1. Check user balance before: `cast balance 0xUSER_ADDRESS --rpc-url https://alfajores-forno.celo-testnet.org`
2. Call `/api/gas/check-and-sponsor`
3. **Expected**: `gasSponsored: true`, `amountSponsored: "0.001"`, `sponsorshipTxHash: "0x..."`
4. Check user balance after: Should have increased by sponsored amount
5. Transaction should be recorded in MongoDB

**Verification:**
```bash
# Before
cast balance 0xUSER_ADDRESS --rpc-url https://alfajores-forno.celo-testnet.org
# Output: 0.0001

# Call API (use curl or frontend)

# After
cast balance 0xUSER_ADDRESS --rpc-url https://alfajores-forno.celo-testnet.org
# Output: 0.0011 (0.0001 + 0.001)
```

---

### Test 3: Rate Limiting

**Setup:**
- User wallet: 0 CELO
- Daily limit: 10 sponsorships

**Steps:**
1. Make 10 successful sponsorship requests
2. Make 11th request
3. **Expected**: HTTP 429, error message: "Daily sponsorship limit reached"

**Test Script:**
```javascript
// test-rate-limit.js
const testRateLimit = async () => {
  const results = [];
  
  for (let i = 0; i < 11; i++) {
    const response = await fetch('http://localhost:3000/api/gas/check-and-sponsor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress: '0xUSER_ADDRESS',
        contractAddress: '0xCONTRACT',
        abi: [...],
        functionName: 'deposit',
        args: []
      })
    });
    
    results.push({
      attempt: i + 1,
      status: response.status,
      data: await response.json()
    });
  }
  
  console.table(results);
  
  // Verify first 10 succeeded, 11th failed
  assert(results.slice(0, 10).every(r => r.status === 200));
  assert(results[10].status === 429);
};

testRateLimit();
```

---

### Test 4: Cooldown Period

**Setup:**
- Cooldown: 5 minutes
- User: Fresh wallet

**Steps:**
1. Make successful sponsorship request
2. Wait 2 minutes
3. Make second request
4. **Expected**: HTTP 429, error: "Please wait 3 more minutes..."
5. Wait 3 more minutes (total 5)
6. Make third request
7. **Expected**: Success

---

### Test 5: Backend Wallet Insufficient Balance

**Setup:**
- Backend wallet: 0.001 CELO
- User needs: 0.01 CELO

**Steps:**
1. Drain backend wallet to very low balance
2. Make sponsorship request
3. **Expected**: HTTP 503, error: "Gas sponsorship service temporarily unavailable"

**Warning**: This will trigger low balance alerts if configured

---

### Test 6: Transaction Simulation Failure

**Setup:**
- Contract function that would revert
- User: Has enough tokens but transaction would fail

**Steps:**
1. Attempt to sponsor gas for a reverting transaction
2. **Expected**: HTTP 400, error: "Transaction simulation failed"

**Example:**
```bash
# Try to withdraw more than balance
curl -X POST http://localhost:3000/api/gas/check-and-sponsor \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0xUSER",
    "contractAddress": "0xMINISAFE",
    "abi": [...],
    "functionName": "withdraw",
    "args": ["999999999999999999999"]  // More than user has
  }'
```

---

## Database Verification

After running tests, verify MongoDB records:

```javascript
// Connect to MongoDB
use esusu

// Check sponsorships
db.gasSponsorships.find({}).sort({ createdAt: -1 }).limit(10)

// Count sponsorships per user
db.gasSponsorships.aggregate([
  { $group: {
    _id: "$recipientAddress",
    count: { $sum: 1 },
    totalSponsored: { $sum: { $toDouble: "$amountCELO" } }
  }}
])

// Check for failed sponsorships
db.gasSponsorships.find({ status: "failed" })
```

---

## Integration Testing with Frontend

### Test Component

Create a test page to verify the hook:

```tsx
// pages/test-gas-sponsorship.tsx
import { useGasSponsorship } from '@/hooks/useGasSponsorship';
import { useAccount } from 'wagmi';
import { useState } from 'react';

export default function TestGasSponsorship() {
  const { address } = useAccount();
  const { checkAndSponsor, isChecking, error } = useGasSponsorship();
  const [result, setResult] = useState<any>(null);

  const testSponsorship = async () => {
    if (!address) return;

    const res = await checkAndSponsor(address, {
      contractAddress: '0xYourContract',
      abi: YOUR_ABI,
      functionName: 'deposit',
      args: [parseEther('1')],
    });

    setResult(res);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Gas Sponsorship Test</h1>
      
      <div className="mb-4">
        <p>Connected: {address || 'Not connected'}</p>
      </div>

      <button
        onClick={testSponsorship}
        disabled={isChecking || !address}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {isChecking ? 'Checking...' : 'Test Sponsorship'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">
          Error: {error.message}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

### Test Checklist

- [ ] User with sufficient gas → No sponsorship
- [ ] User with insufficient gas → Gas sponsored
- [ ] Gas sponsored amount appears in user wallet
- [ ] Loading states display correctly
- [ ] Error messages show for rate limits
- [ ] Success messages show for sponsorship
- [ ] Transaction can proceed after sponsorship

---

## Performance Testing

### Load Test Script

Test with multiple concurrent users:

```javascript
// load-test.js
import { performance } from 'perf_hooks';

async function loadTest(numRequests) {
  const start = performance.now();
  
  const requests = Array.from({ length: numRequests }, (_, i) =>
    fetch('http://localhost:3000/api/gas/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress: `0x${i.toString().padStart(40, '0')}`,
        contractAddress: '0xContract',
        abi: [...],
        functionName: 'deposit',
        args: []
      })
    })
  );

  await Promise.all(requests);
  
  const end = performance.now();
  console.log(`${numRequests} requests completed in ${end - start}ms`);
  console.log(`Average: ${(end - start) / numRequests}ms per request`);
}

loadTest(100);
```

---

## Monitoring During Testing

### Watch Backend Wallet Balance

```bash
# Script to monitor wallet balance
while true; do
  balance=$(cast balance 0xBACKEND_WALLET --rpc-url https://forno.celo.org)
  echo "$(date): Backend wallet balance: $balance"
  sleep 60
done
```

### Watch Database Sponsorships

```javascript
// MongoDB watch script
db.gasSponsorships
  .watch()
  .on('change', (change) => {
    console.log('New sponsorship:', change);
  });
```

### API Stats Monitoring

```bash
# Poll stats endpoint every 30 seconds
while true; do
  curl -s http://localhost:3000/api/gas/stats | jq
  sleep 30
done
```

---

## Common Issues & Solutions

### Issue: "BACKEND_WALLET_PRIVATE_KEY environment variable is required"

**Solution**: Set the environment variable in `.env.local`

### Issue: Sponsorships not appearing in database

**Solution**: 
1. Check MongoDB connection
2. Check connection string
3. Verify database name

### Issue: Rate limit not working

**Solution**:
1. Check Date/Time on server
2. Verify MongoDB indexes are created
3. Check cooldown time zone handling

### Issue: Gas estimates too high/low

**Solution**:
1. Adjust buffer percentage in config
2. Check for complex contract interactions
3. Verify gas price oracle

---

## Automated Test Suite (Optional)

### Unit Tests

```typescript
// __tests__/gasEstimation.test.ts
import { getGasEstimationService } from '@/lib/services/gasEstimationService';

describe('GasEstimationService', () => {
  it('should estimate gas correctly', async () => {
    const service = getGasEstimationService();
    const estimate = await service.estimateTransactionGas({
      userAddress: '0x...',
      contractAddress: '0x...',
      abi: [...],
      functionName: 'deposit',
      args: []
    });

    expect(estimate.gasLimit).toBeGreaterThan(0n);
    expect(estimate.totalCostCELO).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// __tests__/gasSponsorship.integration.test.ts
import { getGasSponsorshipService } from '@/lib/services/gasSponsorshipService';

describe('GasSponsorshipService Integration', () => {
  it('should sponsor gas for user with insufficient balance', async () => {
    const service = getGasSponsorshipService();
    const result = await service.checkAndSponsorGas({
      userAddress: testUser,
      contractAddress: testContract,
      abi: testAbi,
      functionName: 'deposit',
      args: []
    });

    expect(result.success).toBe(true);
    expect(result.transactionHash).toBeDefined();
  });
});
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All manual tests passed
- [ ] Backend wallet funded with at least 100 CELO
- [ ] MongoDB indexes created
- [ ] Environment variables set correctly
- [ ] Rate limits configured appropriately
- [ ] Low balance alerts configured
- [ ] Monitoring dashboard set up
- [ ] Documentation reviewed
- [ ] Team trained on monitoring procedures

---

## Next Steps

After successful testing:
1. Deploy to staging/testnet
2. Run through all test scenarios again
3. Monitor for 24-48 hours
4. If stable, deploy to production
5. Continue monitoring for issues

## Support

If you encounter issues during testing, check:
1. Backend wallet balance
2. MongoDB connection
3. Environment variables
4. API error logs
5. Implementation plan for troubleshooting section
