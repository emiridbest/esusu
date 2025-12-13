"use client";

import React from 'react';

interface FaqItem {
  q: string;
  a: string;
  href: string;
}

const faqsList: FaqItem[] = [
  {
    q: "How does the savings feature work?",
    a: "Our savings feature allows you to set money aside regularly. You can create different saving goals, schedule automatic deposits, and track your progress toward your financial targets. Interest is calculated daily and credited to your account monthly.",
    href: "javascript:void(0)",
  },
  {
    q: "What is a Breaktime Lock and how does it protect my savings?",
    a: "A Breaktime Lock is our unique feature that helps you commit to your savings goals. When activated, it prevents withdrawals from your savings for a predetermined period that you choose. This helps build discipline and ensures you don't touch your savings until you've reached your target.",
    href: "javascript:void(0)",
  },
  {
    q: "How can I withdraw funds from my account?",
    a: "You can withdraw funds through our app by navigating to the 'Withdraw' section. Simply enter the amount you wish to withdraw and select your preferred payment method. Standard withdrawals typically process within 1-2 business days, while express withdrawals may be available within hours.",
    href: "javascript:void(0)",
  },
  {
    q: "Can I pay utility bills through the app?",
    a: "Yes! Our app supports payments for various utility bills including electricity, water, internet, cable TV, and more. You can schedule one-time payments or set up recurring payments to ensure your bills are always paid on time.",
    href: "javascript:void(0)",
  },
  {
    q: "What are the fees associated with using the app?",
    a: "We strive to keep our fees transparent and minimal. Basic savings accounts have no monthly fees. Premium features like express withdrawals and certain utility bill payments may incur small service charges. Check our fee schedule in the app for detailed information.",
    href: "javascript:void(0)",
  },
];

const FaqSection: React.FC = () => {
  return (
    <section className='py-14'>
      <div className="max-w-screen-xl mx-auto px-4 md:px-8">
        <div className="space-y-5 sm:text-center sm:max-w-md sm:mx-auto">
          <h3 className="text-gray-800 text-3xl font-extrabold sm:text-4xl">
            How can we help?
          </h3>
          <p className="text-gray-600">
            Everything you need to know about our savings and payment services. Can not find the answer you are looking for? feel free to{" "}
            <a
              className='text-indigo-600 font-semibold whitespace-nowrap'
              href='javascript:void(0)'>
              contact us
            </a>.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="mx-auto sm:max-w-xs">
            <div className="relative">
              <svg className="w-6 h-6 text-gray-400 absolute left-3 inset-y-0 my-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Search for answers"
                className="w-full pl-12 pr-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
              />
            </div>
          </form>
        </div>
        <div className='mt-12'>
          <ul className='space-y-8 gap-12 grid-cols-2 sm:grid sm:space-y-0 lg:grid-cols-3'>
            {faqsList.map((item, idx) => (
              <li
                key={idx}
                className="space-y-3"
              >
                <summary
                  className="flex items-center justify-between font-semibold text-gray-700">
                  {item.q}
                </summary>
                <p
                  dangerouslySetInnerHTML={{ __html: item.a }}
                  className='text-gray-600 leading-relaxed'>
                </p>
                <a href={item.href} className="flex items-center gap-x-1 text-sm text-indigo-600 hover:text-indigo-400 duration-150 font-medium">
                  Read more
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z" clipRule="evenodd" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
