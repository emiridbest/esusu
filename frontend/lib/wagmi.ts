import { createConfig, http } from 'wagmi'
import { celo } from 'viem/chains'
import { injected, metaMask } from 'wagmi/connectors'


export const config = createConfig({
  chains: [celo],
  connectors: [
    injected(),   // browser extension wallets (MetaMask, Rabby, etc.)
    metaMask(),   // explicit MetaMask deeplink on mobile
  ],
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