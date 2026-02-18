import { NextResponse } from 'next/server';

const agentCard = {
  name: "Esusu AI",
  description:
    "Autonomous onchain financial execution agent for the Esusu decentralized savings protocol on Celo. Handles faucet claims, savings deposits/withdrawals, yield operations, and thrift (rotational savings) group management.",
  url: "https://esusuafrica.com",
  provider: {
    organization: "Esusu Africa",
    url: "https://esusuafrica.com",
  },
  version: "1.0.0",
  capabilities: {
    streaming: false,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["text/plain"],
  skills: [
    {
      id: "faucet-management",
      name: "Faucet & Gas Subsidy Management",
      description:
        "Claim CELO or USDT gas subsidies, verify GoodDollar whitelist status, whitelist eligible users, monitor faucet balances, and enforce claim cooldown periods.",
      tags: ["faucet", "gas", "celo", "usdt", "whitelist", "gooddollar"],
      examples: [
        "Claim CELO gas for my wallet",
        "Check if I'm whitelisted for claims",
        "How long until my next claim?",
      ],
    },
    {
      id: "savings-yield",
      name: "Savings & Yield Operations",
      description:
        "Deposit tokens into Esusu yield vaults, withdraw savings, break timelocks, calculate accrued yield, and estimate rewards.",
      tags: ["savings", "yield", "deposit", "withdraw", "timelock", "defi"],
      examples: [
        "Deposit 10 USDT into savings",
        "Check my savings balance",
        "Withdraw my funds from the yield pool",
      ],
    },
    {
      id: "thrift-management",
      name: "Thrift / Rotational Savings (Esusu Circles)",
      description:
        "Create and join thrift groups, contribute to active rounds, track contribution history, trigger payouts, and exit completed cycles.",
      tags: ["thrift", "esusu", "rotational-savings", "group", "contribution"],
      examples: [
        "Create a new thrift group",
        "Join an existing thrift circle",
        "Contribute to my thrift round",
      ],
    },
  ],
};

export async function GET() {
  return NextResponse.json(agentCard, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
