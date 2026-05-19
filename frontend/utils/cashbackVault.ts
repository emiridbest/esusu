// CashBackVault contract — deployed on Celo
// Esusu × G$ Cashback Reward Program: 20% cashback on G$ utility payments

export const CASHBACK_VAULT_ADDRESS =
  '0x7AdE783F709bCd51a0FB28D00f0F1935DC4101F9' as const;

export const CASHBACK_VAULT_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'cashBack',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'token', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'Sent',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    stateMutability: 'payable',
    type: 'receive',
  },
  {
    inputs: [],
    name: 'admin',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// G$ token address on Celo mainnet
export const G_DOLLAR_ADDRESS =
  '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A' as const;

// 20% cashback rate
export const CASHBACK_BPS = 2000; // 20% in basis points

// Minimum qualifying G$ payment
export const MIN_PAYMENT_GD = 300;

// Maximum cashback per transaction in G$
export const MAX_CASHBACK_GD = 10000;
