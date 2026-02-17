// @ts-nocheck
import { EVMWalletClient } from '@goat-sdk/wallet-evm';
import { Tool } from '@goat-sdk/core';
import { z } from 'zod';
import { encodeFunctionData, parseAbi } from 'viem';
import { EsusuParameters, EmptyParameters, UserAddressParameters } from './parameters';
import { contractAddress, abi } from "../lib/utils";

export class EsusuFaucetService {

    private readonly contractAddress: string = contractAddress;
    private readonly abi = abi;


    /**
     * Claims a gas fee from the Esusu faucet balance for a specified user.
     * This can only be called by the authorized AI.
     * @param params The parameters for the tool, including the recipient's address and an optional amount.
     * @returns A promise that resolves with a message indicating the result of the claim.
     */
    @Tool({
        name: 'claimUsdtForUser',
        description: 'Claim usdt from the Esusu faucet for a specific user on minipay',
        parameters: EsusuParameters,
    })
    public async claimUsdtForUser(
        walletClient: EVMWalletClient,
        // @ts-ignore
        params: EsusuParameters
    ) {
        if (!params.recipient) {
            return 'A recipient address must be provided to claim for a user.';
        }
        if (!walletClient) {
            return 'Error: Wallet client is not initialized. Please ensure the plugin is configured.';
        }

        try {

            // 2. Encode the function call
            const encodedData = encodeFunctionData({
                abi: this.abi,
                functionName: 'claimForUser',
                args: [params.recipient, params.usdtAddress]
            });


            // 4. Send transaction with raw data
            const tx = await walletClient.sendTransaction({
                to: this.contractAddress,
                data: encodedData
            });

            

            return `Transaction sent for ${params.recipient}. Transaction hash: ${tx.hash}`;
        } catch (error: any) {
            console.error('Error claiming tokens for user:', error?.message ?? error);
            if (String(error?.message || '').includes('Wait for cooldown')) {
                const cooldownTime = await this.getTimeUntilNextClaim(walletClient, { userAddress: params.recipient });
                return `The user ${params.recipient} cannot claim yet. ${cooldownTime}`;
            }
            return `Failed to claim tokens for ${params.recipient}. ${error?.message ?? 'Unknown error.'}`;
        }
    }


    /**
     * Claims a gas fee from the Esusu faucet balance for a specified user.
     * This can only be called by the authorized AI.
     * @param params The parameters for the tool, including the recipient's address and an optional amount.
     * @returns A promise that resolves with a message indicating the result of the claim.
     */
    @Tool({
        name: 'claimCeloForUser',
        description: 'Claim celo from the Esusu faucet for a specific user who is not on minipay',
        parameters: EsusuParameters,
    })
    public async claimCeloForUser(
        walletClient: EVMWalletClient,
        // @ts-ignore
        params: EsusuParameters
    ) {
        if (!params.recipient) {
            return 'A recipient address must be provided to claim for a user.';
        }
        if (!walletClient) {
            return 'Error: Wallet client is not initialized. Please ensure the plugin is configured.';
        }

        try {


            // 2. Encode the function call
            const encodedData = encodeFunctionData({
                abi: this.abi,
                functionName: 'claimForUser',
                args: [params.recipient, params.celoAddress]
            });
            // 4. Send transaction with raw data
            const tx = await walletClient.sendTransaction({
                to: this.contractAddress,
                data: encodedData
            });

            return `Transaction sent for ${params.recipient}. Transaction hash: ${tx.hash}`;
        } catch (error: any) {
            console.error('Error claiming tokens for user:', error?.message ?? error);
            if (String(error?.message || '').includes('Wait for cooldown')) {
                const cooldownTime = await this.getTimeUntilNextClaim(walletClient, { userAddress: params.recipient });
                return `The user ${params.recipient} cannot claim yet. ${cooldownTime}`;
            }
            return `Failed to claim tokens for ${params.recipient}. ${error?.message ?? 'Unknown error.'}`;
        }
    }

    // @ts-ignore
    @Tool({
        name: 'fundFaucet',
        description: 'Fund the Esusu faucet with tokens',
        parameters: EsusuParameters,
    })
    async fundFaucet(
        walletClient: EVMWalletClient,
        parameters: EsusuParameters
    ): Promise<string> {
        if (!parameters.amount) {
            throw new Error('Amount is required');
        }
        if (!walletClient) {
            return 'Error: Wallet client is not available for funding.';
        }

        try {
            const tx = await walletClient.sendTransaction({
                to: this.contractAddress,
                abi: this.abi,
                functionName: 'fundFaucet',
                args: [parameters.amount]
            });
            return tx.hash;
        } catch (err: any) {
            console.error('Error funding faucet:', err?.message ?? err);
            return `Failed to fund faucet: ${err?.message ?? 'Unknown error'}`;
        }
    }

    // @ts-ignore
    @Tool({
        name: 'emergencyWithdraw',
        description: 'Emergency withdraw tokens from the faucet (owner only)',
        parameters: EsusuParameters,
    })
    async emergencyWithdraw(
        walletClient: EVMWalletClient,
        parameters: EsusuParameters
    ): Promise<string> {
        if (!parameters.amount) {
            throw new Error('Amount is required');
        }
        if (!walletClient) {
            return 'Error: Wallet client is not available for emergency withdraw.';
        }

        try {
            const tx = await walletClient.sendTransaction({
                to: this.contractAddress,
                abi: this.abi,
                functionName: 'emergencyWithdraw',
                args: [parameters.amount]
            });
            return tx.hash;
        } catch (err: any) {
            console.error('Error during emergency withdraw:', err?.message ?? err);
            return `Emergency withdraw failed: ${err?.message ?? 'Unknown error'}`;
        }
    }

    // @ts-ignore
    @Tool({
        name: 'getFaucetBalance',
        description: 'Get the current balance of the Esusu faucet',
        parameters: EmptyParameters,
    })
    async getFaucetBalance(
        walletClient: EVMWalletClient,
        // @ts-ignore
        params: EmptyParameters
    ): Promise<EVMReadResult> {
        try {
            if (!walletClient) {
                return 'Error: Wallet client is not initialized. Please ensure the plugin is configured.';
            }

            // Prefer read if available
            const balance = await walletClient.read({
                address: this.contractAddress,
                abi: this.abi,
                functionName: 'getFaucetBalance',
                args: []
            });

            return ` The faucet balance is: ${String(balance.value)}`;

        } catch (error: any) {
            console.error('Error getting faucet balance:', error?.message ?? error);
            return `Error: Could not retrieve faucet balance. ${error?.message ?? ''}`;
        }
    }


    // @ts-ignore
    @Tool({
        name: 'getTimeUntilNextClaim',
        description: 'Get the time until the next claim for a specific user',
        parameters: UserAddressParameters,
    })
    public async getTimeUntilNextClaim(
        walletClient: EVMWalletClient,
        // @ts-ignore
        params: UserAddressParameters
    ): Promise<EVMReadResult> {
        if (!params.userAddress) {
            return 'A recipient address must be provided to claim for a user.';
        }
        if (!walletClient) {
            return 'Error: Wallet client is not initialized. Please ensure the plugin is configured.';
        }
        try {
            const raw = await walletClient.read({
                address: this.contractAddress,
                abi: this.abi,
                functionName: 'getTimeUntilNextClaim',
                args: [params.userAddress]
            });

            // raw can be a BigInt, an object with .value, or undefined. Normalize it.
            let seconds: number | null = null;

            if (raw === undefined || raw === null) {
                console.warn('getTimeUntilNextClaim returned undefined/null for', params.userAddress);
                seconds = null;
            } else if (typeof raw === 'bigint') {
                seconds = Number(raw);
            } else if (typeof raw === 'number') {
                seconds = raw;
            } else if (typeof raw === 'string' && /^[0-9]+$/.test(raw)) {
                seconds = Number(raw);
            } else if (typeof (raw as any).value !== 'undefined') {
                const v = (raw as any).value;
                if (typeof v === 'bigint') seconds = Number(v);
                else if (typeof v === 'string' && /^[0-9]+$/.test(v)) seconds = Number(v);
                else if (typeof v === 'number') seconds = v;
            }

            if (seconds === null) {
                return 'Could not determine next claim time for this user.';
            }

            if (seconds === 0) {
                return 'This user has not claimed any tokens yet.';
            }

            // seconds likely represents a unix timestamp delta or epoch. Heuristic: if it's large (>1e9) treat as epoch seconds
            const isEpoch = seconds > 1e9;
            if (isEpoch) {
                const date = new Date(seconds * 1000);
                return `Next claim time (UTC): ${date.toUTCString()}`;
            }

            // otherwise treat as duration (seconds until next claim)
            let remaining = seconds;
            const hrs = Math.floor(remaining / 3600);
            remaining %= 3600;
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            return `Time until next claim: ${hrs}h ${mins}m ${secs}s`;
        } catch (error) {
            console.error('Error getting next claim time:', error);
            return 'Failed to get the next claim time.';
        }
    }

    /**
 * Add an address to the whitelist for AI claims on the Esusu faucet.
 * First checks GoodDollar contract to confirm user is whitelisted.
 * If not whitelisted on GoodDollar, transaction is aborted.
 */
    @Tool({
        name: "whitelistUser",
        description:
            "Whitelist a user address for AI claims on the Esusu faucet after verifying GoodDollar whitelist status",
        parameters: UserAddressParameters,
    })
    async whitelistUserForClaims(
        walletClient: EVMWalletClient,
        parameters: UserAddressParameters
    ): Promise<string> {
        if (!parameters?.userAddress) {
            return "❌ A valid user address must be provided.";
        }

        if (!walletClient) {
            return "❌ Wallet client not available.";
        }

        const identityAddress = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42";

        const identityABI = parseAbi([
            "function isWhitelisted(address _member) view returns (bool)",
        ]);

        // --------------------------------------------------
        // STEP 1: Check GoodDollar whitelist
        // --------------------------------------------------
        try {
            const result = await walletClient.read({
                address: identityAddress,
                abi: identityABI,
                functionName: "isWhitelisted",
                args: [parameters.userAddress],
            });

            // Normalize return value safely
            const isWhitelisted =
                typeof result === "boolean"
                    ? result
                    : typeof result?.result === "boolean"
                        ? result.result
                        : typeof result?.value === "boolean"
                            ? result.value
                            : false;

            if (!isWhitelisted) {
                return ` Transaction aborted.

                User ${parameters.userAddress} is NOT whitelisted on GoodDollar.

                Cannot whitelist for Esusu claims.
                Please ensure you do face verification with GoodDollar to become eligible for Esusu faucet claims.
                `;
                            }
                        } catch (error) {
                            console.error("GoodDollar whitelist check failed:", error);
                            return ` Transaction aborted.

                Failed to verify GoodDollar whitelist status.`;
                        }

        // --------------------------------------------------
        // STEP 2: Execute Esusu whitelist transaction
        // --------------------------------------------------
        try {
            const tx = await walletClient.sendTransaction({
                to: this.contractAddress,
                abi: this.abi,
                functionName: "addToWhitelist",
                args: [parameters.userAddress],
            });

            return `✅ Transaction executed successfully!

            User ${parameters.userAddress} is now whitelisted for claims.

            Transaction hash: ${tx.hash}`;
                    } catch (error: any) {
                        console.error("Whitelisting transaction failed:", error);
                        return ` Failed to whitelist user.

            Reason: ${error?.message ?? "Unknown error"}`;
        }
    }


}