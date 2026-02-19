import { NextResponse } from 'next/server';

const agentRegistration = {
  type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
  name: 'Esusu AI',
  registrations: [
    {
      agentId: 126,
      agentRegistry: 'eip155:42220:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    },
  ],
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET() {
  return NextResponse.json(agentRegistration, {
    headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=3600' },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
