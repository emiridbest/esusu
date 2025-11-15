import { createThirdwebClient } from "thirdweb";
import { celo } from "thirdweb/chains";

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

if (!clientId) {
  throw new Error("Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable");
}

// Create the thirdweb client
export const client = createThirdwebClient({
  clientId,
});

// Export the active chain
export const activeChain = celo;
