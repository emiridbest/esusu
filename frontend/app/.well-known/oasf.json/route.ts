import { NextResponse } from 'next/server';

const oasfDescriptor = {
  schema_version: '1.0',
  name: 'Esusu AI',
  description:
    'Autonomous onchain financial execution agent for the Esusu decentralized savings protocol on Celo. Handles faucet claims, savings deposits/withdrawals, yield operations, and thrift (rotational savings) group management.',
  url: 'https://esusuafrica.com',
  logo: 'https://blob.8004scan.app/baa223bcf7c0b3b6299c4a2891c50a4afb9db4862c4ca68e6c2f16321d19af98.jpg',
  version: '1.0.0',
  skills: [
    { name: 'tool_interaction/api_schema_understanding', id: 1401 },
    { name: 'tool_interaction/workflow_automation', id: 1402 },
    { name: 'tool_interaction/tool_use_planning', id: 1403 },
    {
      name: 'natural_language_processing/information_retrieval_synthesis/question_answering',
      id: 10302,
    },
  ],
  domains: [
    { name: 'technology/blockchain', id: 109 },
    { name: 'technology/blockchain/cryptocurrency', id: 10901 },
    { name: 'technology/blockchain/defi', id: 10902 },
    { name: 'finance_and_business/finance', id: 202 },
    { name: 'finance_and_business/banking', id: 201 },
  ],
  capabilities: {
    mcp: {
      url: 'https://esusuafrica.com/.well-known/mcp.json',
      status: 'healthy',
    },
    a2a: {
      url: 'https://esusuafrica.com/.well-known/agent-card.json',
      status: 'healthy',
    },
    api: {
      url: 'https://esusuafrica.com/api/chat',
      status: 'healthy',
    },
  },
  chain: {
    name: 'Celo',
    chain_id: 42220,
  },
  contact: {
    website: 'https://esusuafrica.com',
  },
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET() {
  return NextResponse.json(oasfDescriptor, {
    headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=3600' },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
