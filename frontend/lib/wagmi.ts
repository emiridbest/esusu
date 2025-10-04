import { createConfig, http, webSocket, fallback } from 'wagmi'
import { celo } from 'viem/chains'
import { injected, metaMask } from 'wagmi/connectors'
import { inAppWalletConnector } from '@thirdweb-dev/wagmi-adapter'
import { client } from '@/lib/thirdweb'

// Create wagmi config with Thirdweb integration and dRPC as primary RPC
export const config = createConfig({
  chains: [celo],
  connectors: [
    inAppWalletConnector({
      client,
    }),
  ],
  transports: {
    [celo.id]: fallback([
      webSocket('wss://celo.drpc.org'),
      http('https://celo.drpc.org'),
      http('https://rpc.ankr.com/celo'),
    ]),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
