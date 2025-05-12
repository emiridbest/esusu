"use client";
import { Alfajores, Celo } from "@celo/rainbowkit-celo/chains";
import { http, createConfig, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect, useState } from "react";
import sdk from "@farcaster/frame-sdk";
import { FrameContext } from "@farcaster/frame-node";

// Configuration for Wagmi
export const config = createConfig({
  chains: [Celo, Alfajores],
  transports: {
    [Celo.id]: http(),
  },
})

// Create a client for React Query
const queryClient = new QueryClient()

export function AppProvider({ children }: { children: ReactNode }) {
  // Move hooks inside the component function
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<FrameContext>();

  useEffect(() => {
    const load = async () => {
      const frameContext = await sdk.context;
      if (!frameContext) {
        return;
      }

      setContext(frameContext as unknown as FrameContext);
      setIsSDKLoaded(true);
    };
    
    if (sdk && !isSDKLoaded) {
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded]);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children as JSX.Element}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default AppProvider;