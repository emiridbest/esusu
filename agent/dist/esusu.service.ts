// @ts-nocheck
import { EVMWalletClient } from '@goat-sdk/wallet-evm';
import { Tool } from '@goat-sdk/core';
import { z } from 'zod';
import { EsusuParameters } from './parameters';
import { abi, contractAddress } from "../lib/utils";

export class EsusuService {
    private readonly contractAddress: string = contractAddress;
    private readonly abi = abi;
    @Tool({
        name: 'depositCelo',
        description: 'Deposit CELO tokens into the Esusu contract',
        parameters: {
            amount: 'Amount of CELO tokens to deposit',
            celoTokenAddress: 'CELO token address'
        }
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
    @Tool({
        name: 'depositCusd',
        description: 'Deposit cUSD tokens into the Esusu contract',
        parameters: {
            amount: 'Amount of cUSD tokens to deposit',
            cusdTokenAddress: 'cUSD token address'
        }
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
    @Tool({
        name: 'withdraw',
        description: 'Withdraw tokens from the Esusu contract',
        parameters: {
            celoTokenAddress: 'CELO token address',
            cusdTokenAddress: 'cUSD token address',
            account: 'Account to withdraw for'
        }
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
    @Tool({
        name: 'getBalance',
        description: 'Get token balance for an account in the Esusu contract',
        parameters: {
            account: 'Account to check balance for',
            tokenAddress: 'Token address to check balance of'
        }
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
    @Tool({
        name: 'breakTimelock',
        description: 'Break the timelock for token withdrawal',
        parameters: {
            celoTokenAddress: 'CELO token address',
            cusdTokenAddress: 'cUSD token address'
        }
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
    @Tool({
        name: 'getDownliners',
        description: 'Get list of downliners for a specific upliner',
        parameters: {
            account: 'Account to get downliners for'
        }
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
    @Tool({
        name: 'setUpliner',
        description: 'Set an upliner for the current account',
        parameters: {
            upliner: 'Address of the upliner to set'
        }
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

    @Tool({
        name: 'timeSinceDeposit',
        description: 'Get time elapsed since last deposit for an account',
        parameters: {
            account: 'Account to check time for'
        }
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