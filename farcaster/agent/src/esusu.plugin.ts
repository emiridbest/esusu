import { PluginBase, Chain } from "@goat-sdk/core";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";
import { EsusuFaucetService } from "./esusu.service";

export class EsusuPlugin extends PluginBase<EVMWalletClient> {
    constructor() {
        super("esusufaucet", [new EsusuFaucetService()]);
    }

    supportsChain = (chain: Chain) => chain.type === "evm";
}

export const esusu = () => new EsusuPlugin();