    // @ts-nocheck
import { EVMWalletClient } from '@goat-sdk/wallet-evm';
import { Tool } from '@goat-sdk/core';
import { z } from 'zod';
import { EsusuParameters } from './parameters';
import { abi, contractAddress } from "../lib/utils";

export class EsusuService {
    private readonly contractAddress: string = contractAddress;
    private readonly abi = abi;
    // @ts-ignore
    @Tool({
        name: 'depositCelo',
        description: 'Deposit CELO tokens into the Esusu contract'
    })
    async depositCelo(
        walletClient: EVMWalletClient, 
        parameters: EsusuParameters
    ): Promise<string> {
        const tx = await walletClient.sendTransaction({
            to: this.contractAddress,
            abi: this.abi,
            functionName: 'deposit',
            args: [parameters.celoTokenAddress, parameters.amount]
        });
        return tx.hash;
    }
    // @ts-ignore
    @Tool({
        name: 'depositCusd',
        description: 'Deposit cUSD tokens into the Esusu contract'
    })
    async depositCusd(
        walletClient: EVMWalletClient, 
        parameters: EsusuParameters
    ): Promise<string> {
        const tx = await walletClient.sendTransaction({
            to: this.contractAddress,
            abi: this.abi,
            functionName: 'deposit',
            args: [parameters.cusdTokenAddress, parameters.amount]
        });
        return tx.hash;
    }
    // @ts-ignore
    @Tool({
        name: 'withdraw',
        description: 'Withdraw tokens from the Esusu contract'
    })
    async withdraw(
        walletClient: EVMWalletClient, 
        parameters: EsusuParameters
    ): Promise<string> {
        const tx = await walletClient.sendTransaction({
            to: this.contractAddress,
            abi: this.abi,
            functionName: 'withdraw',
            args: [parameters.celoTokenAddress, parameters.cusdTokenAddress, parameters.account]
        });
        return tx.hash;
    }
    // @ts-ignore
    @Tool({
        name: 'getBalance',
        description: 'Get token balance for an account in the Esusu contract'
    })
    async getBalance(
        walletClient: EVMWalletClient, 
        parameters:EsusuParameters
    ): Promise<string> {
        const balance = await walletClient.read({
            address: this.contractAddress,
            abi: this.abi,
            functionName: 'getBalance',
            args: [parameters.account, parameters.tokenAddress]
        });
        return balance.toString();
    }
    // @ts-ignore
    @Tool({
        name: 'breakTimelock',
        description: 'Break the timelock for token withdrawal'
    })
    async breakTimelock(
        walletClient: EVMWalletClient, 
        parameters: EsusuParameters
    ): Promise<string> {
        const tx = await walletClient.sendTransaction({
            to: this.contractAddress,
            abi: this.abi,
            functionName: 'breakTimelock',
            args: [parameters.celoTokenAddress, parameters.cusdTokenAddress]
        });
        return tx.hash;
    }
    // @ts-ignore
    @Tool({
        name: 'getDownliners',
        description: 'Get list of downliners for a specific upliner'
    })
    async getDownliners(
        walletClient: EVMWalletClient, 
        parameters: EsusuParameters
    ): Promise<string[]> {
        const downliners = await walletClient.read({
            address: this.contractAddress,
            abi: this.abi,
            functionName: 'getDownliners',
            args: [parameters.account]
        });
        return downliners.toString().split(',');
    }
    // @ts-ignore
    @Tool({
        name: 'setUpliner',
        description: 'Set an upliner for the current account'
    })
    async setUpliner(
        walletClient: EVMWalletClient, 
        parameters: EsusuParameters
    ): Promise<string> {
        const tx = await walletClient.sendTransaction({
            to: this.contractAddress,
            abi: this.abi,
            functionName: 'setUpliner',
            args: [parameters.upliner]
        });
        return tx.hash;
    }

    // @ts-ignore
    @Tool({
        name: 'timeSinceDeposit',
        description: 'Get time elapsed since last deposit for an account'
    })
    async timeSinceDeposit(
        walletClient: EVMWalletClient, 
        parameters: EsusuParameters
    ): Promise<string> {
        const time = await walletClient.read({
            address: this.contractAddress,
            abi: this.abi,
            functionName: 'timeSinceDeposit',
            args: [parameters.account]
        });
        return time.toString();
    }
}