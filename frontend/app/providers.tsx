"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { ReactNode } from "react";
import { ClaimProvider } from "@/context/utilityProvider/ClaimContextProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiConfig, configureChains, createConfig } from "wagmi";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";
import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { Celo } from "@celo/rainbowkit-celo/chains";

// RainbowKit + Wagmi v1 setup for Celo
const queryClient = new QueryClient();

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  process.env.NEXT_PUBLIC_PROJECT_ID;

const CELO_RPC_URL = process.env.NEXT_PUBLIC_CELO_RPC_URL || "https://forno.celo.org";

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [Celo],
  [
    jsonRpcProvider({
      rpc: (chain) => (chain.id === Celo.id ? { http: CELO_RPC_URL } : null),
    }),
    publicProvider(),
  ]
);

const { connectors } = getDefaultWallets({
  appName: "Esusu",
  projectId: walletConnectProjectId ?? "MISSING_PROJECT_ID",
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains}>
          <ClaimProvider>{children}</ClaimProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

// Legacy Next.js pages App removed


export default AppProvider;