"use client";

import { ReactNode } from "react";
import { ClaimProvider } from "@/context/utilityProvider/ClaimContextProvider";
import { ThriftProvider } from "@/context/thrift/ThriftContext";
import { MiniSafeProvider } from "@/context/miniSafe/MiniSafeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThirdwebProvider } from "thirdweb/react";
import { WagmiProvider } from 'wagmi';
import { config } from "@/lib/wagmi";
import { client, activeChain } from "@/lib/thirdweb";

// Suppress MetaMask/extension injection errors that occur with multiple wallets
// These are harmless extension conflicts, not app bugs
if (typeof window !== 'undefined' && typeof console !== 'undefined') {
  const originalError = console.error;
  console.error = function (...args: any[]) {
    const message = String(args[0] || '');

    if (message.includes('MetaMask encountered an error')) {
      return; // Suppress - expected with multiple wallets
    }
    if (message.includes('Cannot set property ethereum')) {
      return; // Suppress - extension conflict
    }

    originalError.apply(console, args);
  };
}

// Thirdweb setup with EIP-6963 wallet discovery
// EIP-6963 standard: Wallets announce via events instead of fighting over window.ethereum
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <ThirdwebProvider>
        <QueryClientProvider client={queryClient}>
          <ClaimProvider>
            <ThriftProvider>
              <MiniSafeProvider>
                {children}
              </MiniSafeProvider>
            </ThriftProvider>
          </ClaimProvider>
        </QueryClientProvider>
      </ThirdwebProvider>
    </WagmiProvider>
  );
}