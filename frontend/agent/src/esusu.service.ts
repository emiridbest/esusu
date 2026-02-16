// @ts-nocheck
import { EVMWalletClient } from '@goat-sdk/wallet-evm';
import { Tool } from '@goat-sdk/core';
import { z } from 'zod';
import { encodeFunctionData } from 'viem';
import { EsusuParameters, EmptyParameters, UserAddressParameters, FeedbackParameters } from './parameters';
import { contractAddress, abi } from "../lib/utils";
import { getReferralTag, submitReferral } from '@divvi/referral-sdk'
import { BrowserProvider, Contract, parseEther, formatUnits } from "ethers";



export class EsusuFaucetService {

    private readonly contractAddress: string = contractAddress;
    private readonly abi = abi;

    // Hardcoded referral configuration
    private readonly referralUser = "0x4d4cC2E0c5cBC9737A0dEc28d7C2510E2BEF5A09" as `0x${string}`;
    private readonly referralConsumer = "0xb82896C4F251ed65186b416dbDb6f6192DFAF926";

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
            // 1. Generate Referral Tag
            const dataSuffix = getReferralTag({
                user: this.referralUser,
                consumer: this.referralConsumer,
            });

            // 2. Encode the function call
            const encodedData = encodeFunctionData({
                abi: this.abi,
                functionName: 'claimForUser',
                args: [params.recipient, params.usdtAddress]
            });

            // 3. Append suffix (remove 0x from suffix)
            const fullData = `${encodedData}${dataSuffix.replace(/^0x/, '')}` as `0x${string}`;

            // 4. Send transaction with raw data
            const tx = await walletClient.sendTransaction({
                to: this.contractAddress,
                data: fullData
            });

            // Wait for receipt if publicClient is available
            if (walletClient.publicClient && typeof walletClient.publicClient.waitForTransactionReceipt === 'function') {
                try {
                    const receipt = await walletClient.publicClient.waitForTransactionReceipt({ hash: tx.hash });
                    if ((receipt as any).status === 'success' || (receipt as any).status === 1) {
                        // 5. Submit referral on success
                        await submitReferral({
                            txHash: tx.hash as `0x${string}`,
                            chainId: 42220,
                        }).catch((referralError) => {
                            console.error("Referral submission failed:", referralError);
                        });

                        return `Successfully initiated gas fee claim for user ${params.recipient}. Transaction hash: ${tx.hash}`;
                    }
                    if (!tx) throw new Error("Transaction submission failed");

                    return `Claim transaction for ${params.recipient} may have failed. Transaction hash: ${tx.hash}`;
                } catch (receiptErr) {
                    // If waiting fails, still return tx hash so user can check manually
                    console.error('Error waiting for receipt:', receiptErr);
                    return `Transaction sent for ${params.recipient} (tx: ${tx.hash}). Waiting for confirmation failed; please check the transaction status on the explorer.`;
                }
            }

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
            // 1. Generate Referral Tag
            const dataSuffix = getReferralTag({
                user: this.referralUser,
                consumer: this.referralConsumer,
            });

            // 2. Encode the function call
            const encodedData = encodeFunctionData({
                abi: this.abi,
                functionName: 'claimForUser',
                args: [params.recipient, params.celoAddress]
            });

            // 3. Append suffix (remove 0x from suffix)
            const fullData = `${encodedData}${dataSuffix.replace(/^0x/, '')}` as `0x${string}`;

            // 4. Send transaction with raw data
            const tx = await walletClient.sendTransaction({
                to: this.contractAddress,
                data: fullData
            });

            // Wait for receipt if publicClient is available
            if (walletClient.publicClient && typeof walletClient.publicClient.waitForTransactionReceipt === 'function') {
                try {
                    const receipt = await walletClient.publicClient.waitForTransactionReceipt({ hash: tx.hash });
                    if ((receipt as any).status === 'success' || (receipt as any).status === 1) {
                        await submitReferral({
                            txHash: tx.hash as `0x${string}`,
                            chainId: 42220,
                        }).catch((referralError) => {
                            console.error("Referral submission failed:", referralError);
                        });
                        return `Successfully initiated gas fee claim for user ${params.recipient}. Transaction hash: ${tx.hash}`;
                    }
                    if (!tx) throw new Error("Transaction submission failed");
                    return `Claim transaction for ${params.recipient} may have failed. Transaction hash: ${tx.hash}`;
                } catch (receiptErr) {
                    // If waiting fails, still return tx hash so user can check manually
                    console.error('Error waiting for receipt:', receiptErr);
                    return `Transaction sent for ${params.recipient} (tx: ${tx.hash}). Waiting for confirmation failed; please check the transaction status on the explorer.`;
                }
            }

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
        description: 'Fund the Esusu faucet with tokens'
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
        description: 'Emergency withdraw tokens from the faucet (owner only)'
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
        description: 'Get the current balance of the Esusu faucet'
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
        description: 'Get the time until the next claim for a specific user'
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
        name: "whitelistUserForClaims",
        description:
            "Whitelist a user address for AI claims on the Esusu faucet after verifying GoodDollar whitelist status",
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
            "function isWhitelist(address _member) view returns (bool)",
        ]);

        // --------------------------------------------------
        // STEP 1: Check GoodDollar whitelist
        // --------------------------------------------------
        try {
            const result = await walletClient.read({
                address: identityAddress,
                abi: identityABI,
                functionName: "isWhitelist",
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
                functionName: "whitelistForClaims",
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

    /**
     * Deposit tokens to Esusu smart contract for Aave Yields
     * This is handled by triggering user wallet to send a transaction to the Esusu contract address with the appropriate data payload to trigger the deposit function.
     * @param params The parameters for the tool, including the recipient's address and an optional amount.
     * @returns A promise that resolves with a message indicating the result of the deposit action.
     */
    // @ts-ignore
    @Tool({
        name: 'depositToEsusu',
        description: 'Prepare deposit transaction for user wallet. User deposits tokens to Esusu for Aave yields.'
    })
    async depositToEsusu(
        walletClient: EVMWalletClient,
        parameters: EsusuParameters
    ): Promise<string> {
        if (!parameters.amount) {
            return 'Error: Amount is required for deposit';
        }
        if (!parameters.tokenAddress) {
            return 'Error: Token address is required for deposit';
        }

        // Return JSON that frontend will parse
        return JSON.stringify({
            type: 'DEPOSIT_REQUIRED',
            action: 'depositToEsusu',
            tokenAddress: parameters.tokenAddress,
            amount: parameters.amount,
            message: 'Please confirm the deposit transaction in your wallet'
        });
    }
    /**
     * Agent will ask user for feedback after transactions. This tool captures that feedback.
     * @param params The parameters for the tool, including feedback type and comments.
     */
    @Tool({
        name: 'giveFeedbackOnchain',
        description: 'Prepare onchain feedback transaction for user to sign. User submits feedback about an AI agent to the reputation registry.'
    })
    async giveFeedbackOnchain(
        walletClient: EVMWalletClient,
        parameters: FeedbackParameters
    ): Promise<string> {
        if (!parameters.agentId) {
            return 'Error: Agent ID is required for feedback';
        }
        if (!parameters.value) {
            return 'Error: Feedback value is required';
        }
        if (!parameters.tag1) {
            return 'Error: Primary tag is required';
        }
        if (!parameters.feedbackURI) {
            return 'Error: Feedback URI is required';
        }
        if (!parameters.feedbackHash) {
            return 'Error: Feedback hash is required';
        }

        // Return instructions for frontend - DO NOT EXECUTE
        return `🔐 USER WALLET SIGNATURE REQUIRED

To submit feedback onchain for Agent #${parameters.agentId}:

Feedback Details:
- Value: ${parameters.value} (with ${parameters.valueDecimals} decimals)
- Primary Tag: ${parameters.tag1}
- Secondary Tag: ${parameters.tag2 || 'None'}
- Endpoint: ${parameters.endpoint}
- Feedback URI: ${parameters.feedbackURI}
- Content Hash: ${parameters.feedbackHash}

 IMPORTANT: This transaction requires YOUR wallet signature.

Transaction Data:
${JSON.stringify({
            type: 'FEEDBACK_REQUIRED',
            action: 'giveFeedback',
            contractAddress: this.reputationRegistryAddress, // Add this as a class property
            params: {
                agentId: parameters.agentId,
                value: parameters.value,
                valueDecimals: parameters.valueDecimals,
                tag1: parameters.tag1,
                tag2: parameters.tag2 || "",
                endpoint: parameters.endpoint,
                feedbackURI: parameters.feedbackURI,
                feedbackHash: parameters.feedbackHash
            }
        })}

The AI agent cannot sign this transaction. You must approve it in your wallet.`;
    }

}