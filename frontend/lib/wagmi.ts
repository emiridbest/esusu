import { createConfig, http } from 'wagmi'
import { celo } from 'viem/chains'
import { injected, metaMask } from 'wagmi/connectors'
import { inAppWalletConnector } from '@thirdweb-dev/wagmi-adapter'
import { client } from '@/lib/thirdweb'

// Create wagmi config with Thirdweb integration
export const config = createConfig({
  chains: [celo],
  connectors: [
    inAppWalletConnector({
      client,
    }),
  ],
  transports: {
    [celo.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
