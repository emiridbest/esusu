// ABI for PaymentRouter contract
// Deploy the contract first, then update PAYMENT_ROUTER_ADDRESS below.

export const PAYMENT_ROUTER_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export const PaymentType = {
  Data: 0,
  Airtime: 1,
  Electricity: 2,
  Other: 3,
} as const;

export const PAYMENT_ROUTER_ABI = [
  {
    type: "function",
    name: "payWithToken",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "paymentType", type: "uint8" },
      { name: "reference", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "payWithNative",
    inputs: [
      { name: "paymentType", type: "uint8" },
      { name: "reference", type: "string" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "paymentCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "recipient",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "supportedTokens",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "addToken",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeToken",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setRecipient",
    inputs: [{ name: "_recipient", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "PaymentMade",
    inputs: [
      { name: "paymentId", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "paymentType", type: "uint8", indexed: false },
      { name: "reference", type: "string", indexed: false },
    ],
  },
] as const;

// ERC-20 approve ABI (needed for token approval before payWithToken)
export const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;
