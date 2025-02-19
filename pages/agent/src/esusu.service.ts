import { EVMWalletClient } from '@goat-sdk/wallet-evm';
import {
    DepositCeloParameters,
    DepositCusdParameters,
    GetBalanceParameters,
    SetUplinerParameters,
    BreakTimelockParameters,
    GetDownlinersParameters,
    TimeSinceDepositParameters,
    WithdrawParameters,
    CELO_TOKEN_ADDRESS,
    CUSD_TOKEN_ADDRESS,
} from './parameters';
import { contractAddress, abi } from '../lib/utils';

export class EsusuService {
    private readonly contractAddress: string = contractAddress;
    private readonly abi = abi;

    async depositCelo(walletClient: EVMWalletClient, parameters: DepositCeloParameters): Promise<string> {
        const tx = await walletClient.sendTransaction({
            to: this.contractAddress,
            abi: this.abi,
            functionName: 'deposit',
            args: [CELO_TOKEN_ADDRESS, parameters.amount]
        });
        return tx.hash;
    }

    async deposit(walletClient: EVMWalletClient, parameters: DepositCusdParameters): Promise<string> {
        const tx = await walletClient.sendTransaction({
            to: this.contractAddress,
            abi: this.abi,
            functionName: 'deposit',
            args: [CUSD_TOKEN_ADDRESS, parameters.amount]
        });
        return tx.hash;
    }

    async withdraw(walletClient: EVMWalletClient, parameters: WithdrawParameters): Promise<string> {
        const tx = await walletClient.sendTransaction({
            to: this.contractAddress,
            abi: this.abi,
            functionName: 'withdraw',
            args: [parameters.tokenAddress]
        });
        return tx.hash;
    }

    async getBalance(walletClient: EVMWalletClient, parameters: GetBalanceParameters): Promise<string> {
        const balance = await walletClient.read({
            address: this.contractAddress,
            abi: this.abi,
            functionName: 'getBalance',
            args: [parameters.account, parameters.tokenAddress]
        });
        return balance.toString();
    }

    async breakTimelock(walletClient: EVMWalletClient, parameters: BreakTimelockParameters): Promise<string> {
        const tx = await walletClient.sendTransaction({
            to: this.contractAddress,
            abi: this.abi,
            functionName: 'breakTimelock',
            args: [parameters.tokenAddress]
        });
        return tx.hash;
    }

    async getDownliners(walletClient: EVMWalletClient, parameters: GetDownlinersParameters): Promise<string[]> {
        const downliners = await walletClient.read({
            address: this.contractAddress,
            abi: this.abi,
            functionName: 'getDownliners',
            args: [parameters.upliner]
        });
        return downliners.toString().split(',');
    }

    async setUpliner(walletClient: EVMWalletClient, parameters: SetUplinerParameters): Promise<string> {
        const tx = await walletClient.sendTransaction({
            to: this.contractAddress,
            abi: this.abi,
            functionName: 'setUpliner',
            args: [parameters.upliner]
        });
        return tx.hash;
    }

    async timeSinceDeposit(walletClient: EVMWalletClient, parameters: TimeSinceDepositParameters): Promise<string> {
        const time = await walletClient.read({
            address: this.contractAddress,
            abi: this.abi,
            functionName: 'timeSinceDeposit',
            args: [parameters.depositor]
        });
        return time.toString();
    }


}