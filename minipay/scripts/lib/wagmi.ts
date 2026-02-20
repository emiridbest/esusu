import { createConfig, http, webSocket, fallback } from 'wagmi'
import { celo } from 'viem/chains'
import { injected, metaMask } from 'wagmi/connectors'

// Create wagmi config with multiple RPC endpoints
// Note: WebSocket transport doesn't work reliably in browser environments
// Using HTTP with proper timeouts and multiple fallbacks for reliability
export const config = createConfig({
  chains: [celo],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [celo.id]: http('https://forno.celo.org', {
      timeout: 30_000,
      retryCount: 3,
    }),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
