import { type Chain, PluginBase } from "@goat-sdk/core";
import { EsusuService } from "./esusu.service";

export class EsusuPlugin extends PluginBase {
    constructor() {
        super("esusu", [new EsusuService()]);
    }

    supportsChain = (chain: Chain) => chain.type === "evm";
}

export function esusu() {
    return new EsusuPlugin();
}