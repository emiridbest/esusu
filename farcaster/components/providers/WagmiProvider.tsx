import { createConfig, http, injected, WagmiProvider } from "wagmi";
import { celo } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterFrame as miniAppConnector } from '@farcaster/frame-wagmi-connector'

// Create a custom config with error handling
export const config = createConfig({
  chains: [celo],
  transports: {
    [celo.id]: http(),
  },
  connectors: [ miniAppConnector(), injected() ],
});

const queryClient = new QueryClient();

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
