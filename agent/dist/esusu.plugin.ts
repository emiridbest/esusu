import { PluginBase, Chain } from "@goat-sdk/core";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";
import { EsusuService } from "./esusu.service";

export class EsusuPlugin extends PluginBase<EVMWalletClient> {
    constructor() {
        super("esusu", [new EsusuService()]);
    }

    supportsChain = (chain: Chain) => chain.type === "evm";
}

export const esusu = () => new EsusuPlugin();