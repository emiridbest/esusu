"use client";
import { Alfajores, Celo } from "@celo/rainbowkit-celo/chains";
import { http, createConfig, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from "react";

export const config = createConfig({
  chains: [Celo, Alfajores],
  transports: {
    [Celo.id]: http(),
  },
})

const queryClient =  new QueryClient()


export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children as JSX.Element}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default AppProvider;