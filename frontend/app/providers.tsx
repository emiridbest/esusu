"use client";

import { ReactNode } from "react";
import { ClaimProvider } from "@/context/utilityProvider/ClaimContextProvider";
import { ThriftProvider } from "@/context/thrift/ThriftContext";
import { MiniSafeProvider } from "@/context/miniSafe/MiniSafeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BetaFeaturesProvider } from "@/context/BetaFeaturesContext";
import { Web3AuthProvider } from "@web3auth/modal/react";
import web3AuthContextConfig from "./web3authConfig";
import { config } from "@/lib/wagmi";
import { WagmiProvider } from "@web3auth/modal/react/wagmi";

const queryClient = new QueryClient();


export function Providers({ children }: { children: ReactNode }) {
  return (
    <Web3AuthProvider config={web3AuthContextConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <ClaimProvider>
            <BetaFeaturesProvider>
              <ThriftProvider>
                <MiniSafeProvider>
                  {children}
                </MiniSafeProvider>
              </ThriftProvider>
            </BetaFeaturesProvider>
          </ClaimProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </Web3AuthProvider>
  );
}