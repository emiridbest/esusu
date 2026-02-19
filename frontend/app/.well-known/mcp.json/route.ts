import { NextRequest, NextResponse } from 'next/server';

// ── MCP Protocol Constants ──────────────────────────────────────────
const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'Esusu AI', version: '1.0.0' };

// ── Tool Definitions ────────────────────────────────────────────────
const TOOLS = [
  {
    name: "claimUsdtForUser",
    description: "Claim USDT from the Esusu faucet for a specific user on MiniPay",
    inputSchema: {
      type: "object",
      properties: {
        recipient: { type: "string", description: "Recipient wallet address (0x...)" },
        usdtAddress: { type: "string", description: "USDT token contract address on Celo", default: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" },
      },
      required: ["recipient"],
    },
  },
  {
    name: "claimCeloForUser",
    description: "Claim CELO from the Esusu faucet for a specific user not on MiniPay",
    inputSchema: {
      type: "object",
      properties: {
        recipient: { type: "string", description: "Recipient wallet address (0x...)" },
        celoAddress: { type: "string", description: "CELO token address on Celo", default: "0x0000000000000000000000000000000000000000" },
      },
      required: ["recipient"],
    },
  },
  {
    name: "whitelistUserForClaims",
    description: "Whitelist a user address for AI claims on the Esusu faucet after verifying GoodDollar whitelist status",
    inputSchema: {
      type: "object",
      properties: {
        userAddress: { type: "string", description: "The user's wallet address to whitelist" },
      },
      required: ["userAddress"],
    },
  },
  {
    name: "getFaucetBalance",
    description: "Get the current balance of the Esusu faucet (CELO and USDT)",
    inputSchema: {
      type: "object",
      properties: {
        tokenAddress: { type: "string", description: "Optional specific token address. Omit to get both CELO and USDT balances." },
      },
    },
  },
  {
    name: "getTimeUntilNextClaim",
    description: "Get the time remaining until the next claim for a specific user",
    inputSchema: {
      type: "object",
      properties: {
        userAddress: { type: "string", description: "The user's wallet address" },
      },
      required: ["userAddress"],
    },
  },
  {
    name: "depositToEsusu",
    description: "Deposit tokens into Esusu yield vaults",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount to deposit" },
      },
      required: ["amount"],
    },
  },
  {
    name: "withdrawFromEsusu",
    description: "Withdraw savings from Esusu yield pools",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount to withdraw" },
      },
      required: ["amount"],
    },
  },
  {
    name: "breakTimelock",
    description: "Break an active timelock on savings (where permitted)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "contributeToThrift",
    description: "Contribute to an active thrift round",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Contribution amount" },
      },
      required: ["amount"],
    },
  },
  {
    name: "createThriftGroup",
    description: "Create a new thrift (rotational savings) group",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the thrift group" },
      },
      required: ["name"],
    },
  },
  {
    name: "joinThriftGroup",
    description: "Join an existing thrift contribution cycle",
    inputSchema: {
      type: "object",
      properties: {
        groupId: { type: "string", description: "The thrift group ID to join" },
      },
      required: ["groupId"],
    },
  },
  {
    name: "checkSavingsBalance",
    description: "Check the user's current savings balance in Esusu vaults",
    inputSchema: {
      type: "object",
      properties: {
        userAddress: { type: "string", description: "The user's wallet address" },
      },
      required: ["userAddress"],
    },
  },
];

// ── Resource Definitions ────────────────────────────────────────────
const RESOURCES = [
  { uri: "esusu://contracts", name: "esusu_smart_contracts", description: "Esusu protocol smart contracts on Celo" },
  { uri: "esusu://faucet", name: "faucet_contract", description: "Esusu faucet contract for gas subsidies" },
  { uri: "esusu://thrift", name: "thrift_contract", description: "Thrift (rotational savings) contract" },
  { uri: "esusu://vault", name: "yield_vault_contract", description: "Yield vault contract for savings" },
  { uri: "esusu://network", name: "celo_network_config", description: "Celo blockchain network configuration" },
];

// ── CORS Headers ────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

// ── JSON-RPC Helpers ────────────────────────────────────────────────
function jsonrpcSuccess(id: string | number | null, result: unknown) {
  return { jsonrpc: '2.0' as const, id, result };
}

function jsonrpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: '2.0' as const, id, error: { code, message } };
}

// ── MCP Method Handlers ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleMethod(method: string, id: string | number | null, _params: any) {
  switch (method) {
    // Core lifecycle
    case 'initialize':
      return jsonrpcSuccess(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: SERVER_INFO,
      });

    // Notifications (no response required, but we ack)
    case 'notifications/initialized':
      return jsonrpcSuccess(id, {});

    // Tool discovery
    case 'tools/list':
      return jsonrpcSuccess(id, { tools: TOOLS });

    // Resource discovery
    case 'resources/list':
      return jsonrpcSuccess(id, { resources: RESOURCES });

    // Prompt discovery
    case 'prompts/list':
      return jsonrpcSuccess(id, { prompts: [] });

    // Health check
    case 'ping':
      return jsonrpcSuccess(id, {});

    default:
      return jsonrpcError(id, -32601, `Method not found: ${method}`);
  }
}

// ── GET: Return flat discovery descriptor (for browsers / simple clients) ──
export async function GET() {
  return NextResponse.json(
    {
      name: SERVER_INFO.name,
      version: PROTOCOL_VERSION,
      description:
        'Autonomous onchain financial execution agent for the Esusu decentralized savings protocol on Celo. Handles faucet claims, savings deposits/withdrawals, yield operations, and thrift (rotational savings) group management.',
      tools: TOOLS,
      prompts: [],
      resources: RESOURCES,
    },
    {
      headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=3600' },
    },
  );
}

// ── POST: MCP Streamable HTTP (JSON-RPC over HTTP) ──────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle batch requests (array of JSON-RPC objects)
    if (Array.isArray(body)) {
      const results = body
        .map((item: { method: string; id?: string | number | null; params?: unknown }) =>
          handleMethod(item.method, item.id ?? null, item.params),
        )
        .filter((r: { id: string | number | null }) => r.id !== null); // drop notification responses

      return NextResponse.json(results.length === 1 ? results[0] : results, {
        headers: CORS_HEADERS,
      });
    }

    // Single JSON-RPC request
    const { method, id = null, params = {} } = body;
    const result = handleMethod(method, id, params);

    // Notifications don't need a response body per spec, but sending one is fine
    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      jsonrpcError(null, -32700, 'Parse error'),
      { status: 400, headers: CORS_HEADERS },
    );
  }
}

// ── DELETE: Session termination (MCP spec) ──────────────────────────
export async function DELETE() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

// ── OPTIONS: CORS preflight ─────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
