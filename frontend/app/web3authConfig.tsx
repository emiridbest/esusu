import { CONNECTOR_INITIAL_AUTHENTICATION_MODE, WEB3AUTH_NETWORK } from "@web3auth/modal";
import { type Web3AuthContextConfig } from "@web3auth/modal/react";

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || "WEB3AUTH_CLIENT_ID";

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
    useSFAKey: true,
    initialAuthenticationMode: CONNECTOR_INITIAL_AUTHENTICATION_MODE.CONNECT_AND_SIGN,
  }
};

export default web3AuthContextConfig;
