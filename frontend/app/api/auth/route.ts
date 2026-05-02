import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

// Web3Auth JWKS endpoint — used to verify idTokens issued by Web3Auth
const WEB3AUTH_JWKS_URL = "https://api-auth.web3auth.io/jwks";

// Your Web3Auth Client ID (set in .env)
const WEB3AUTH_CLIENT_ID = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;

/**
 * GET /api/auth
 * Returns provider info — useful for client-side discovery.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "login") {
    return NextResponse.json({
      message: "Social login via Web3Auth",
      status: "available",
      providers: ["google", "facebook", "apple", "email_passwordless", "twitter"],
      clientId: WEB3AUTH_CLIENT_ID,
    });
  }

  return NextResponse.json({
    message: "Web3Auth auth endpoint",
    status: "ready",
  });
}

/**
 * POST /api/auth
 * Verifies a Web3Auth idToken sent from the client.
 *
 * Expected body:
 *  { action: "verify", idToken: "<jwt from Web3Auth>", address: "0x..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "verify") {
      const { idToken, address } = body;

      if (!idToken) {
        return NextResponse.json(
          { success: false, message: "idToken is required" },
          { status: 400 }
        );
      }

      try {
        // Fetch Web3Auth's public keys and verify the JWT
        const JWKS = jose.createRemoteJWKSet(new URL(WEB3AUTH_JWKS_URL));

        const { payload } = await jose.jwtVerify(idToken, JWKS, {
          algorithms: ["ES256"],
        });

        // payload.wallets contains the user's wallet addresses from Web3Auth
        const wallets = (payload as any).wallets as
          | { address: string; type: string }[]
          | undefined;

        const verifiedAddress =
          wallets?.find((w) => w.type === "ethereum")?.address ?? null;

        // Optionally cross-check against the address the client claims
        if (address && verifiedAddress) {
          if (verifiedAddress.toLowerCase() !== address.toLowerCase()) {
            return NextResponse.json(
              { success: false, message: "Address mismatch" },
              { status: 401 }
            );
          }
        }

        return NextResponse.json({
          success: true,
          message: "Token verified",
          user: {
            address: verifiedAddress ?? address ?? null,
            email: (payload as any).email ?? null,
            name: (payload as any).name ?? null,
            profileImage: (payload as any).profileImage ?? null,
            verifier: (payload as any).verifier ?? null,
            verifierId: (payload as any).verifierId ?? null,
          },
        });
      } catch (jwtError) {
        console.error("JWT verification failed:", jwtError);
        return NextResponse.json(
          { success: false, message: "Invalid or expired token" },
          { status: 401 }
        );
      }
    }

    // Fallback for unrecognised actions
    return NextResponse.json({
      success: true,
      message: "Auth request processed",
    });
  } catch (error) {
    console.error("Auth endpoint error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}