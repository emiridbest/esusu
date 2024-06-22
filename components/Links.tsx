import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';

const Links: React.FC = () => {
    const router = useRouter();
    return (
        <div className="sm:hidden flex flex-wrap justify-around p-4 bg-gypsum rounded-lg shadow-md">
            <div className="flex flex-col items-center p-4 m-2 bg-gypsum shadow rounded-lg cursor-pointer" onClick={() => router.push('/miniSafe')}>
                <Image
                    src="/save.png"
                    width="60"
                    height="60"
                    alt="Save"
                    className="mb-2"
                />
                <h3 className="text-xs  text-black">Save</h3>
            </div>
            <div className="flex flex-col items-center p-4 m-2 bg-gypsum shadow rounded-lg cursor-pointer" onClick={() => router.push('/thrift')}>
                <Image
                    src="/thrift.png"
                    width="60"
                    height="60"
                    alt="Contribution"
                    className="mb-2"
                />
                <h3 className="text-xs  text-black">Contribution</h3>
            </div>
            <div className="flex flex-col items-center p-4 m-2 bg-gypsum shadow rounded-lg cursor-pointer" onClick={() => router.push('/utilityBills')}>
                <Image
                    src="/earn.png"
                    width="60"
                    height="60"
                    alt="Swap"
                    className="mb-2"
                />
                <h3 className="text-xs  text-black">Swap</h3>
            </div>
            <div className="flex flex-col items-center p-4 m-2 bg-gypsum shadow rounded-lg cursor-pointer" onClick={() => router.push('/utilityBills')}>
                <Image
                    src="/bills.png"
                    width="60"
                    height="60"
                    alt="Pay Now"
                    className="mb-2"
                />
                <h3 className="text-xs  text-black">Pay Now</h3>
            </div>
        </div>
    );
};

export default Links;
