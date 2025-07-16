"use client";
import { Alfajores, Celo } from "@celo/rainbowkit-celo/chains";
import { RainbowKitProvider, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";
import { WagmiConfig, configureChains, createConfig } from "wagmi";
import { publicProvider } from "wagmi/providers/public";
import { ReactNode } from "react";
import { ClaimProvider } from "@/context/utilityProvider/ClaimContextProvider";

const { chains, publicClient } = configureChains(
  [Celo],
  [publicProvider()]
);

const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      injectedWallet({ chains }),
    ],
  },
]);

const appInfo = {
  appName: "Celo Composer",
};

export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains} appInfo={appInfo} coolMode={true} showRecentTransactions={true}>
        <ClaimProvider>
          {children}
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