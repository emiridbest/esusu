import React from 'react';

interface StatItem {
    data: string;
    desc: string;
}

const stats: StatItem[] = [
    {
        data: "35K",
        desc: "Customers onboarded."
    },
    {
        data: "10K+",
        desc: "Downloads of mobile app"
    },
    {
        data: "40+",
        desc: " Countries reached"
    },
    {
        data: "30M+",
        desc: "Total revenue generated"
    },
];

const YourComponent: React.FC = () => {
    return (
        <section className="py-28 bg-gray-900">
            <div className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-8">
                <div className="max-w-2xl xl:mx-auto xl:text-center">
                    <h3 className="text-white text-3xl font-semibold sm:text-4xl">
                        Our customers are always happy
                    </h3>
                    <p className="mt-3 text-gray-300">
                        Saving in crypto stable coins has never been easier.
                    </p>
                </div>
                <div className="mt-12">
                    <ul className="flex-wrap gap-x-12 gap-y-10 items-center space-y-8 sm:space-y-0 sm:flex xl:justify-center">
                        {stats.map((item, idx) => (
                            <li key={idx} className="sm:max-w-[15rem]">
                                <h4 className="text-4xl text-white font-semibold">{item.data}</h4>
                                <p className="mt-3 text-gray-400 font-medium">{item.desc}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
};

export default YourComponent;
