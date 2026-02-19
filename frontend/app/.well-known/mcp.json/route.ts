import { NextResponse } from 'next/server';

const SERVER_INFO = {
  name: "Esusu AI",
  version: "1.0.0",
};

const CAPABILITIES = {
  tools: {},
  resources: {},
};

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

const RESOURCES = [
  { uri: "esusu://contracts", name: "esusu_smart_contracts", description: "Esusu protocol smart contracts on Celo", mimeType: "application/json" },
  { uri: "esusu://faucet", name: "faucet_contract", description: "Esusu faucet contract for gas subsidies", mimeType: "application/json" },
  { uri: "esusu://thrift", name: "thrift_contract", description: "Thrift (rotational savings) contract", mimeType: "application/json" },
  { uri: "esusu://vault", name: "yield_vault_contract", description: "Yield vault contract for savings", mimeType: "application/json" },
  { uri: "esusu://network", name: "celo_network_config", description: "Celo blockchain network configuration", mimeType: "application/json" },
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonrpcResponse(id: string | number | null, result: any) {
  return { jsonrpc: "2.0", id, result };
}

function jsonrpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

export async function GET() {
  // Return server info for simple GET requests (discovery)
  return NextResponse.json(
    {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      protocol: "MCP",
      protocolVersion: "2025-06-18",
      capabilities: CAPABILITIES,
      tools: TOOLS,
      resources: RESOURCES,
    },
    { headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=3600' } }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Handle JSON-RPC request
    const { jsonrpc, id, method } = body;

    // If it's not a JSON-RPC request, return the static descriptor
    if (!jsonrpc && !method) {
      return NextResponse.json(
        { name: SERVER_INFO.name, version: SERVER_INFO.version, tools: TOOLS, resources: RESOURCES },
        { headers: CORS_HEADERS }
      );
    }

    switch (method) {
      case "initialize":
        return NextResponse.json(
          jsonrpcResponse(id, {
            protocolVersion: "2025-06-18",
            serverInfo: SERVER_INFO,
            capabilities: CAPABILITIES,
          }),
          { headers: CORS_HEADERS }
        );

      case "notifications/initialized":
        // Notification — no response required, but return 200
        return new NextResponse(null, { status: 200, headers: CORS_HEADERS });

      case "tools/list":
        return NextResponse.json(
          jsonrpcResponse(id, { tools: TOOLS }),
          { headers: CORS_HEADERS }
        );

      case "resources/list":
        return NextResponse.json(
          jsonrpcResponse(id, { resources: RESOURCES }),
          { headers: CORS_HEADERS }
        );

      case "prompts/list":
        return NextResponse.json(
          jsonrpcResponse(id, { prompts: [] }),
          { headers: CORS_HEADERS }
        );

      case "tools/call":
        // Tool execution is not supported via this discovery endpoint
        return NextResponse.json(
          jsonrpcError(id, -32601, "Tool execution is not available on this endpoint. Use the main API at /api/chat."),
          { headers: CORS_HEADERS }
        );

      default:
        return NextResponse.json(
          jsonrpcError(id, -32601, `Method not found: ${method}`),
          { headers: CORS_HEADERS }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      jsonrpcError(null, -32700, "Parse error"),
      { status: 400, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
