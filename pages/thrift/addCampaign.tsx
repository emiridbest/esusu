import React, { useState } from 'react';
import { Campaign } from '@/pages/index';
import { ArrowLeftCircleIcon } from "@heroicons/react/24/outline";
import {useRouter} from 'next/router';


interface CampaignPageProps {
    onCreateCampaign: (name: string, description: string, amount: number) => void;
    campaign: Campaign | undefined;
}

const CampaignPage: React.FC<CampaignPageProps> = ({ onCreateCampaign, campaign }) => {
    const [amount, setAmount] = useState<number>(0);
    const [name, setName] = useState<string>(campaign?.name || '');
    const [description, setDescription] = useState<string>(campaign?.description || '');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
const router = useRouter();
    const handleCreateCampaign = () => {
        if (!name || !description || !amount) {
            setError('All fields are required');
            return;
        }
        setIsSubmitting(true);
        onCreateCampaign(name, description, amount);
        setIsSubmitting(false);
    };
    const handleReturnHome = () => {
        router.push('/thrift');
    };

    return (
        <div className="container flex flex-col justify-between items-center sm:justify-center text-sm">

            <div className="bg-gypsum rounded-md shadow-lg px-6 py-8 max-w-md w-full">
                <ArrowLeftCircleIcon
                onClick={handleReturnHome}
                className="h-6 cursor-pointer"
            />
                <div className="text-center">
                    <h1 className="font-bold text-gray-800 mb-4">Create A New Campaign</h1>

                    {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

                    <div className="space-y-4">
                        <fieldset className="relative">
                            <h1 className='flex flex-start font-light text-black'> Name of Campaign</h1>
                            <input
                                className="w-full px-4 py-2 text-gray-700 bg-gypsum border border-gray-300 rounded-md focus:outline-none focus:border-prosperity"
                                placeholder="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </fieldset>
                        <fieldset className="relative">
                            <h1  className='flex flex-start font-light text-black'> Say something about the campaign</h1>
                            <textarea
                                className="w-full px-4 py-2 text-gray-700 bg-gypsum border border-gray-300 rounded-md focus:outline-none focus:border-prosperity"
                                placeholder="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </fieldset>
                        <fieldset className="relative">
                            <h1 className='flex flex-start font-light text-black'>How much are we contributing per month</h1>
                            <input
                                type="number"
                                className="w-full px-4 py-2 text-gray-700 bg-gypsum border border-gray-300 rounded-md focus:outline-none focus:border-prosperity"
                                placeholder="Enter amount"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                step="0.01"
                            />
                        </fieldset>

                        <button
                            onClick={handleCreateCampaign}
                            className="w-full py-3 bg-prosperity text-black  rounded-md hover:bg-sky focus:outline-none focus:ring-2 focus:ring-prosperity focus:ring-opacity-50"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Campaign'}
                        </button>
                    </div>
            </div>
            </div>
            </div>

    );
};

export default CampaignPage;
