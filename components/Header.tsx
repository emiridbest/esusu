import { Disclosure } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useConnect } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import Link from "next/link";
export default function Header() {
    const [hideConnectBtn, setHideConnectBtn] = useState(false);
    const { connect } = useConnect({
        connector: new InjectedConnector(),
    });

    useEffect(() => {
        if (window.ethereum && window.ethereum.isMiniPay) {
            setHideConnectBtn(true);
            connect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

return (
    <Disclosure as="nav" className="bg-prosperity border-b border-black">
        {({ open }) => (
            <>
                <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-2">
                    <div className="relative flex h-16 ">
                        <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                            {/* Mobile menu button */}
                            <Disclosure.Button className="inline-flex items-center  rounded-md p-2 text-black focus:outline-none focus:ring-1 focus:ring-inset focus:rounded-none focus:ring-black">
                                <span className="sr-only">Open main menu</span>
                                {open ? (
                                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                                ) : (
                                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                                )}
                            </Disclosure.Button>
                        </div>
                        <>
                        <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                            <div className="flex items-center">
                                <Image
                                    className="block h-18 w-auto sm:block lg:block"
                                    src="/miniSafe.png"
                                    width="150"
                                    height="180"
                                    alt="MiniSafe Logo"
                                />
                            </div>
                            <div className="sm:ml-6 sm:flex sm:space-x-1">
                                <Link
                                    href="/"
                                    className="inline-flex items-center border-b-2 border-black px-1 pt-1 text-sm font-medium text-gray-900"
                                >
                                    Home
                                </Link>

                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
                                <Link
                                    href="/simple"
                                    className="inline-flex items-center border-b-2 border-black px-1 pt-1 text-sm font-medium text-gray-900"
                                >
                                    Simple Saver
                                </Link>

                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
                                <Link
                                    href="/pay"
                                    className="inline-flex items-center border-b-2 border-black px-1 pt-1 text-sm font-medium text-gray-900"
                                >
                                    Pay Bills
                                </Link>

                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
                                <Link
                                    href="/blogs"
                                    className="inline-flex items-center border-b-2 border-black px-1 pt-1 text-sm font-medium text-gray-900"
                                >
                                    Blog
                                </Link>

                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
                                <Link
                                    href="/faq"
                                    className="inline-flex items-center border-b-2 border-black px-1 pt-1 text-sm font-medium text-gray-900"
                                >
                                    FAQ
                                </Link>

                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
                                <Link
                                    href="/testimonials"
                                    className="inline-flex items-center border-b-2 border-black px-1 pt-1 text-sm font-medium text-gray-900"
                                >
                                    Testimonials
                                </Link>

                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
                                <Link
                                    href="/contact"
                                    className="inline-flex items-center border-b-2 border-black px-1 pt-1 text-sm font-medium text-gray-900"
                                >
                                    Contact
                                </Link>
                                <Link
                                    href="/invest"
                                    className="inline-flex items-center border-b-2 border-black px-1 pt-1 text-sm font-medium text-gray-900"
                                >
                                    Invest
                                </Link>
                                <Link
                                    href="/jobs"
                                    className="inline-flex items-center border-b-2 border-black px-1 pt-1 text-sm font-medium text-gray-900"
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
                            className="block border-l-4 border-black py-2 pl-3 pr-4 text-base font-medium text-black"
                        >
                            Home
                        </Disclosure.Button>
                    </div>
                    <div className="space-y-1 pt-2 pb-4">
                        <Disclosure.Button
                            as="a"
                            href="/simple"
                            className="block border-l-4 border-black py-2 pl-3 pr-4 text-base font-medium text-black"
                        >
                            Simple Saver
                        </Disclosure.Button>
                    </div>
                    <div className="space-y-1 pt-2 pb-4">
                        <Disclosure.Button
                            as="a"
                            href="/pay"
                            className="block border-l-4 border-black py-2 pl-3 pr-4 text-base font-medium text-black"
                        >
                            Pay Bills
                        </Disclosure.Button>
                    </div>
                    <div className="space-y-1 pt-2 pb-4">
                        <Disclosure.Button
                            as="a"
                            href="/blogs"
                            className="block border-l-4 border-black py-2 pl-3 pr-4 text-base font-medium text-black"
                        >
                            Blog
                        </Disclosure.Button>
                    </div>
                    <div className="space-y-1 pt-2 pb-4">
                        <Disclosure.Button
                            as="a"
                            href="faq"
                            className="block border-l-4 border-black py-2 pl-3 pr-4 text-base font-medium text-black"
                        >
                            FAQ
                        </Disclosure.Button>
                    </div>
                    <div className="space-y-1 pt-2 pb-4">
                        <Disclosure.Button
                            as="a"
                            href="/jobs"
                            className="block border-l-4 border-black py-2 pl-3 pr-4 text-base font-medium text-black"
                        >
                            Jobs
                        </Disclosure.Button>
                    </div>
                    <div className="space-y-1 pt-2 pb-4">
                        <Disclosure.Button
                            as="a"
                            href="/testimonials"
                            className="block border-l-4 border-black py-2 pl-3 pr-4 text-base font-medium text-black"
                        >
                            Testimonials
                        </Disclosure.Button>
                    </div>
                    <div className="space-y-1 pt-2 pb-4">
                        <Disclosure.Button
                            as="a"
                            href="/contact"
                            className="block border-l-4 border-black py-2 pl-3 pr-4 text-base font-medium text-black"
                        >
                            Contact Us
                        </Disclosure.Button>
                    </div>
                    <div className="space-y-1 pt-2 pb-4">
                        <Disclosure.Button
                            as="a"
                            href="/invest"
                            className="block border-l-4 border-black py-2 pl-3 pr-4 text-base font-medium text-black"
                        >
                            Invest
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
