import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Campaign } from '@/pages/index';

interface CampaignDetailsModalProps {
    campaign: Campaign;
    onContribute: (address: string, amount: number) => void;
    onClose: () => void;
    onJoinCampaign: (id: number, tokenAddress: string, userName: string) => void;
}

const CampaignDetailsModal: React.FC<CampaignDetailsModalProps> = ({ campaign, onContribute, onClose, onJoinCampaign }) => {
    const [amount, setAmount] = useState<number>(campaign?.contributionAmount);
    const [address, setAddress] = useState("0x765DE816845861e75A25fCA122bb6898B8B1282a");
    const [userName, setUserName] = useState<string>("");
    const [id, setId] = useState<number>(campaign?.id);

    const handleContribute = () => {
        if (amount) {
            onContribute(address, amount);
            onClose();
        }
    };

    const handleJoin = () => {
        if (address && userName && id) {
            onJoinCampaign(id, address, userName);
            onClose();
        }
    };

    return (
        <Dialog.Root open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

            <Dialog.Content
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-md shadow-lg p-6 max-w-3xl mx-auto"
                draggable
            >
                <div className="bg-white rounded-md shadow-lg px-4 py-6">
                    <div className="flex items-center justify-end">
                        <Dialog.Close className="p-2 text-gray-400 rounded-md hover:bg-gray-100">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-5 h-5 mx-auto"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </Dialog.Close>
                    </div>
                    <div className="max-w-sm mx-auto space-y-1 text-center">
                        <Dialog.Title className="text-lg font-medium text-gray-800">
                            {campaign[0]}
                        </Dialog.Title>
                        <p className="px-6 text-center text-xs font-medium text-gray-600 tracking-wider">{campaign[1]}</p>
                        <p className="px-6 py-1 text-center text-xs font-medium text-gray-600 tracking-wider">Contribution Amount: {campaign[2]}</p>
                        <p className="px-6 py-1 text-center text-xs font-medium text-gray-600 tracking-wider">Payout Interval: {campaign[3]}</p>
                        <p className="px-6 py-3 text-center text-xs font-medium text-gray-600 tracking-wider">Total Contributions: {campaign[4]}</p>
                        <p className="px-6 py-3 text-center text-xs font-medium text-gray-600 tracking-wider">Last Payout Block: {campaign[5]}</p>
                        <p className="px-6 py-3 text-center text-xs font-medium text-gray-600 tracking-wider">User Names: {campaign[6]}</p>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Token Address"
                            className="w-full mt-3 py-3 px-4 bg-gray-100 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                        />
                        <input
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="Your Name"
                            className="w-full mt-3 py-3 px-4 bg-gray-100 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600"
                        />
                        <button
                            onClick={handleJoin}
                            className="w-full mt-3 py-3 px-4 bg-black font-medium text-sm text-center text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg ring-offset-2 ring-indigo-600 focus:ring-2"
                        >
                            Join Campaign
                        </button>
                        <button
                            onClick={handleContribute}
                            className="w-full mt-3 py-3 px-4 bg-black font-medium text-sm text-center text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg ring-offset-2 ring-indigo-600 focus:ring-2"
                        >
                            Contribute
                        </button>
                    </div>
                </div>
            </Dialog.Content>
        </Dialog.Root>
    );
};

export default CampaignDetailsModal;
