import { createConfig, http } from 'wagmi'
import { celo } from 'viem/chains'


export const config = createConfig({
  chains: [celo],
  connectors: [],   // Web3Auth WagmiProvider injects its own connector at runtime
  transports: {
    [celo.id]: http('https://forno.celo.org', {
      timeout: 30_000,
      retryCount: 3,
    }),
  },
  ssr: true,      // required for Next.js App Router
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}