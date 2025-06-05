"use client";
import { Alfajores, Celo } from "@celo/rainbowkit-celo/chains";
import celoGroups from "@celo/rainbowkit-celo/lists";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { WagmiConfig, configureChains, createConfig } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { publicProvider } from "wagmi/providers/public";
import { ReactNode } from "react";
import { ClaimProvider } from "@/context/utilityProvider/ClaimContextProvider";

const { chains, publicClient } = configureChains(
  [Celo, Alfajores],
  [publicProvider()]
);

const connectors = [new InjectedConnector({ chains })];
const appInfo = {
  appName: "Celo Composer",
};

export const wagmiConfig = createConfig({
  connectors,
  publicClient: publicClient,
});

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains} appInfo={appInfo} coolMode={true} showRecentTransactions={true}>
        <ClaimProvider>
          {children as JSX.Element}
        </ClaimProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export function App({ Component, pageProps }: any) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains} appInfo={appInfo} coolMode={true} showRecentTransactions={true}>
        <ClaimProvider>
          <Component {...pageProps} />
        </ClaimProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default AppProvider;