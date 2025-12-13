"use client";

import { createConfig, http, WagmiProvider, useConnect } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { celo } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { useEffect } from "react";

// Create a custom config for MiniPay
export const config = createConfig({
  chains: [celo],
  connectors: [
    injected(), // MiniPay injects an Ethereum provider
  ],
  transports: {
    [celo.id]: http(),
  },
});

const queryClient = new QueryClient();

function AutoConnect() {
  const { connectors, connect } = useConnect();

  useEffect(() => {
    // MiniPay requires auto-connection on page load
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  }, [connectors, connect]);

  return null;
}

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config as any}>
      <QueryClientProvider client={queryClient}>
        <AutoConnect />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
