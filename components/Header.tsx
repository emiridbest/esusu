/* eslint-disable react-hooks/exhaustive-deps */
import { Disclosure } from "@headlessui/react";
import { MagnifyingGlassIcon, BellAlertIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useConnect } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Header() {
    const [searchVisible, setSearchVisible] = useState(false); // State for search visibility
    const [searchValue, setSearchValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const { connect } = useConnect({
        connector: new InjectedConnector(),
    });

    useEffect(() => {
        connect();
    }, []);
    const router = useRouter();
    const handleSearchIconClick = () => {
        setSearchVisible(true);
    };
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };
    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <Disclosure as="nav" className="bg-gypsum border-b border-black">
            {({ open }) => (
                <>
                 <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-2">
                        <div className="relative flex h-16 items-center justify-between">
                            <div className="flex items-center">
                                <Image
                                    className=" cursor-pointer"
                                    src="/esusu.png"
                                    width="120"
                                    height="120"
                                    alt="EsusuLogo"
                                    onClick={() => router.push('/')}
                                />
                            </div>
                            <div className="ml-auto flex items-center space-x-4">
                                {searchVisible ? (
                                    <div className="relative">
                                        <input
                                            className="border-2 border-black bg-gypsum text-black h-10 px-5 pr-16 rounded-lg text-sm focus:outline-none"
                                            type="search"
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
                                <BellAlertIcon className="h-6 text-black" />
                            </div>

                            <div className="hidden sm:ml-6 sm:flex sm:space-x-2 hover:bg-prosperity px-3 py-2 rounded-md">
                                <Link
                                    onClick={() => router.push('/miniSafe')}
                                    className="inline-flex items-center border-b-1 border-black px-1 pt-1 text-sm font-small text-gray-900"
                                    href={""}
                                >
                                    Simple Saver
                                </Link>
                            </div>

                            <div className="hidden sm:ml-6 sm:flex sm:space-x-2 hover:bg-prosperity px-3 py-2 rounded-md">
                                <Link
                                    onClick={() => router.push('/thrift')}
                                    className="inline-flex items-center border-b-1 border-black px-1 pt-1 text-sm font-small text-gray-900"
                                    href={""}
                                >
                                    Thrift
                                </Link>
                            </div>

                            <div className="hidden sm:ml-6 sm:flex sm:space-x-2 hover:bg-prosperity px-3 py-2 rounded-md">
                                <Link
                                    onClick={() => router.push('/utilityBills')}
                                    className="inline-flex items-center border-b-1 border-black px-1 pt-1 text-sm font-small text-gray-900"
                                    href={""}
                                >
                                    Pay Bills
                                </Link>
                            </div>


                            <div className="relative inline-block text-left">
                                <div>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center w-full mx-2 px-3 py-2 bg-gypsum text-sm  text-black hover:bg-prosperity focus:outline-none"
                                        onClick={() => setIsOpen(!isOpen)}                                    >
                                        About Us
                                        <svg
                                            className="-mr-1 ml-2 h-5 w-5"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            aria-hidden="true"
                                        >
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>

                                {isOpen && (
                                    <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gypsum cursor-pointer  ring-1 ring-black ring-opacity-5">
                                        <div className="py-1">
                                            <p onClick={() => router.push('/faq')}
                                                className="block px-4 py-2 text-sm text-black hover:bg-prosperity">FAQ
                                            </p>
                                            <p onClick={() => router.push('/testimonials')}
                                                className="block px-4 py-2 text-sm text-black hover:bg-prosperity">Testimonials
                                            </p>
                                            <p onClick={() => router.push('/contact')}
                                                className="block px-4 py-2 text-sm text-black hover:bg-prosperity">Contact
                                            </p>

                                            <p onClick={() => router.push('/invest')} className="block px-4 py-2 text-sm text-black hover:bg-prosperity">Invest
                                            </p>
                                            <p onClick={() => router.push('/jobs')}
                                                className="block px-4 py-2 text-sm text-black hover:bg-prosperity">Jobs
                                            </p>
                                            <p onClick={() => router.push('/blogs')}
                                                className="block px-4 py-2 text-sm text-black hover:bg-prosperity">Blog
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <Disclosure.Panel className="sm:hidden">
                        <div className="space-y-1 pt-2 pb-4">
                            <Disclosure.Button
                                as="a"
                                href="/"
                                className="block border-l-4 border-black px-5 text-base font-small text-black"
                            >
                                Home
                            </Disclosure.Button>
                        </div>
                    </Disclosure.Panel>
                </>
            )}
        </Disclosure>
    );
}

declare global {
    interface Window {
        ethereum: any;
    }
}
