import { CONNECTOR_INITIAL_AUTHENTICATION_MODE, WEB3AUTH_NETWORK } from "@web3auth/modal";
import { type Web3AuthContextConfig } from "@web3auth/modal/react";
import { type IPlugin } from "@web3auth/no-modal";
import { WalletServicesPlugin } from "@web3auth/wallet-services-plugin";

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || "WEB3AUTH_CLIENT_ID";

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
    useSFAKey: true,
    initialAuthenticationMode: CONNECTOR_INITIAL_AUTHENTICATION_MODE.CONNECT_AND_SIGN,
    plugins: [
      () => {
        const plugin = new WalletServicesPlugin({
          walletInitOptions: {
            whiteLabel: { showWidgetButton: false },
          },
        });
        // v9/v10 shim: v10 expects SUPPORTED_CONNECTORS, v9 only has SUPPORTED_ADAPTERS
        (plugin as any).SUPPORTED_CONNECTORS = (plugin as any).SUPPORTED_ADAPTERS ?? [];
        return plugin as unknown as IPlugin;
      },
    ],
  }
};

export default web3AuthContextConfig;
