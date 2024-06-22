/* eslint-disable react-hooks/exhaustive-deps */
import { Disclosure } from "@headlessui/react";
import { MagnifyingGlassIcon, BellAlertIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useConnect } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Header() {
    const [searchVisible, setSearchVisible] = useState(false); // State for search visibility
    const [searchValue, setSearchValue] = useState('');
    const { connect } = useConnect({
        connector: new InjectedConnector(),
    });
    const router = useRouter();

    useEffect(() => {
        connect();
    }, []);
    const handleSearchIconClick = () => {
        setSearchVisible(true);
    };
       return (
        <Disclosure as="nav" className="bg-gypsum border-b border-black">
            {({ open }) => (
                <>
                    <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-2">
                        <div className="relative flex h-16
                         ">

                            <>
                                <div className="flex flex-1 justify-between items-center sm:justify-start sm:items-stretch lg:justify-start">
                                    <div className="flex items-center">
                                        <Image
                                            className="block h-auto w-auto lg:block sm: h-8 cursor-pointer"
                                            src="/esusu.png"
                                            width="120"
                                            height="120"
                                            alt="CeloP2P Logo"
                                            onClick={() => router.push('/')}
                                        />
                                    </div>

                                    <div className="ml-auto flex items-center space-x-4">
                                        {searchVisible ? (
                                            <div className="relative">
                                                <input
                                                    className="border-2 border-black bg-gypsum text-black h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none" type="search"
                                                    name="search"
                                                    placeholder="Search for orders here"
                                                    value={searchValue}
                                                    onChange={(e) => setSearchValue(e.target.value)}
                                                />
                                                <button
                                                    type="submit"
                                                    className="absolute right-0 top-0 mt-2 mr-2"
                                                >
                                                    <MagnifyingGlassIcon className="h-6 text-black text-gypsum transition" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div
                                                className="text-snow hover:text-snow cursor-pointer"
                                                onClick={handleSearchIconClick}
                                            >
                                                <MagnifyingGlassIcon className="text-black h-6 sm:hidden" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="mx-4 sm:hidden">
                                        <BellAlertIcon
                                            className="h-6 text-black" />
                                    </div>
                                    <div className="hidden sm:ml-6 sm:flex sm:space-x-2">

                                        <Link
                                            onClick={() => router.push('/miniSafe')}
                                            className="inline-flex items-center border-b-1 border-black px-1 pt-1 text-sm font-small text-gray-900" href={""}                                    >
                                            Simple Saver
                                        </Link>
                                    </div>

                                    <div className="hidden sm:ml-6 sm:flex sm:space-x-2">

                                        <Link
                                            onClick={() => router.push('/thrift')}
                                            className="inline-flex items-center border-b-1 border-black px-1 pt-1 text-sm font-small text-gray-900" href={""}                                    >
                                            Thrift
                                        </Link>
                                    </div>
                                    <div className="hidden sm:ml-6 sm:flex sm:space-x-2">

                                        <Link
                                            onClick={() => router.push('/utilityBills')}
                                            className="inline-flex items-center border-b-1 border-black px-1 pt-1 text-sm font-small text-gray-900" href={""}                                    >
                                            Pay Bills
                                        </Link>
                                    </div>
                                    <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
                                        <Link
                                            href="/blogs"
                                            className="inline-flex items-center border-b-1 border-black px-1 pt-1 text-sm font-small text-gray-900"
                                        >
                                            Blog
                                        </Link>

                                    </div>
                                    <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
                                        <Link
                                            href="/faq"
                                            className="inline-flex items-center border-b-1 border-black px-1 pt-1 text-sm font-small text-gray-900"
                                        >
                                            FAQ
                                        </Link>

                                    </div>
                                    <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
                                        <Link
                                            href="/testimonials"
                                            className="inline-flex items-center border-b-1 border-black px-1 pt-1 text-sm font-small text-gray-900"
                                        >
                                            Testimonials
                                        </Link>

                                    </div>
                                    <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
                                        <Link
                                            href="/contact"
                                            className="inline-flex items-center border-b-1 border-black px-1 pt-1 text-sm font-small text-gray-900"
                                        >
                                            Contact
                                        </Link>
                                        <Link
                                            href="/invest"
                                            className="inline-flex items-center border-b-1 border-black px-1 pt-1 text-sm font-small text-gray-900"
                                        >
                                            Invest
                                        </Link>
                                        <Link
                                            href="/jobs"
                                            className="inline-flex items-center border-b-1 border-black px-1 pt-1 text-sm font-small text-gray-900"
                                        >
                                            Jobs
                                        </Link>

                                    </div>
                                </div>
                            </>

                        </div>
                    </div>
                    <Disclosure.Panel className="sm:hidden">
                        <div className="space-y-1 pt-2 pb-4">
                            <Disclosure.Button
                                as="a"
                                href="/"
                                className="block border-l-4 border-black px-5  text-base font-small text-black"
                            >
                                Home
                            </Disclosure.Button>
                        </div>
                    </Disclosure.Panel>
                </>
            )}
        </Disclosure>
    )
}

declare global {
    interface Window {
        ethereum: any;
    }
}