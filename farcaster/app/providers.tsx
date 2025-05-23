"use client";
import { Alfajores, Celo } from "@celo/rainbowkit-celo/chains";
import { http, createConfig, WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect } from "react";
import { FarcasterProvider } from "../components/FarcasterProvider";
import { UtilityProvider } from "../context/utilityProvider/UtilityContext";
import posthog from 'posthog-js';

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
  const posthogPublicKey = process.env.NEXT_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  useEffect(() => {
    // Initialize PostHog if the key is available
    if (typeof window !== 'undefined' && posthogPublicKey) {
      posthog.init(posthogPublicKey, {
        api_host: posthogHost,
        persistence: 'memory',
        person_profiles: 'identified_only',
        disable_session_recording: true,
        capture_pageview: true,
        cross_subdomain_cookie: false,
        secure_cookie: true,
        loaded: (ph) => {
          // Generate anonymous session ID without identifying
          const sessionId = ph.get_distinct_id() || crypto.randomUUID();
          ph.register({ session_id: sessionId });

          // Temporary distinct ID that will be aliased later
          if (!ph.get_distinct_id()) {
            ph.reset(true); // Ensure clean state
          }
        },
      });
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        posthog.capture('app_closed');
      }
    };
  }, [posthogPublicKey, posthogHost]);

  return (
    <FarcasterProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <UtilityProvider>
            {children as JSX.Element}
          </UtilityProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </FarcasterProvider>
  );
}

export default AppProvider;