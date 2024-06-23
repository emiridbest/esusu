import React, { useState, useCallback, useEffect } from 'react';
import { EyeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { getContract, formatEther, createPublicClient, http } from "viem";
import { celo, celoAlfajores } from "viem/chains";
import { BrowserProvider} from 'ethers';
import { stableTokenABI } from "@celo/abis";
const STABLE_TOKEN_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

const Balance: React.FC = () => {
    const [cUSDBalance, setCUSDBalance] = useState<string>('0');
    const [showBalanceDetails, setShowBalanceDetails] = useState<boolean>(true);

    const getCUSDBalance = useCallback(async () => {
        if (window.ethereum) {
            try {
                const provider = new BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();

                const publicClient = createPublicClient({
                    chain: celo,
                    transport: http(),
                });

                const StableTokenContract = getContract({
                    abi: stableTokenABI,
                    address: STABLE_TOKEN_ADDRESS,
                    publicClient,
                });
                const address = await signer.getAddress();
                let cleanedAddress = address.substring(2);
                const balanceInBigNumber = await StableTokenContract.read.balanceOf([`0x${cleanedAddress}`]);
                const balanceInWei = balanceInBigNumber;
                const balanceInEthers = formatEther(balanceInWei);

                setCUSDBalance(balanceInEthers);
            } catch (error) {
                console.error('Error fetching cUSD balance:', error);
            }
        }
    }, []);

    useEffect(() => {
        getCUSDBalance();
    }, [getCUSDBalance]);

    const toggleBalanceDetails = () => {
        setShowBalanceDetails(!showBalanceDetails);
    };
    function formatBalance(cUSDBalance: any, decimals = 2) {
        const balanceNumber = parseFloat(cUSDBalance);
        if (isNaN(balanceNumber)) {
            return "0.00";
        }
        return balanceNumber.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }



    return (
            <div className="sm:hidden my-4 p-4 bg-gypsum shadow rounded-lg">
                <div className="flex justify-between items-center">
                    <button
                        onClick={toggleBalanceDetails}
                        className="text-green-900 hover:underline"
                    >
                        {showBalanceDetails ? <LockClosedIcon
                            className="h-5 text-black" /> : <EyeIcon className="text-green-900 text-lg h-4" />}
                    </button>
                </div>
                {showBalanceDetails && (
                    <div className="mt-2 text-black text-4xl font-bold text-overflow-hidden">
                        {formatBalance(cUSDBalance)}cUSD
                    </div>
                )}
                <p className="text-sm">Your wallet balance</p>
                <div className="flex justify-between">
                    <p className="text-sm">{new Date().toLocaleTimeString()}</p>
                    <p className="text-sm">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

    )


}
export default Balance;