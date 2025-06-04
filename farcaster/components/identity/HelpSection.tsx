"use client";

import React from 'react';
import Link from 'next/link';
import { GlobeEuropeAfricaIcon } from '@heroicons/react/24/solid';  

export default function HelpSection() {
    return (
        <div className="w-full mt-8 rounded-xl overflow-hidden border border-black/90 dark:border-black/90 shadow-sm">
            {/* Hero Banner with Spinning Globe */}
            <div className="bg-primary dark:text-black p-8 text-center relative">
                {/* Spinning Globe */}
                <div className="flex justify-center mb-6">
                    <div className="relative w-24 h-24">
                        <GlobeEuropeAfricaIcon
                            className="w-24 h-24 animate-spin text-black/80 dark:text-black/90"
                            style={{ animationDuration: '20s' }}
                        />

                        {/* Globe decoration dots */}
                        <div className="absolute inset-0 animate-pulse">
                            <div className="absolute top-2 left-4 w-1 h-1 bg-white/60 rounded-full"></div>
                            <div className="absolute top-6 right-3 w-1 h-1 bg-white/60 rounded-full"></div>
                            <div className="absolute bottom-4 left-2 w-1 h-1 bg-white/60 rounded-full"></div>
                            <div className="absolute bottom-2 right-5 w-1 h-1 bg-white/60 rounded-full"></div>
                        </div>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-black dark:text-black/80 mb-2">Free Money, As a Public Good</h1>
                <h2 className="text-lg font-semibold text-black/95 dark:text-black/80 mb-4">Unlocking Human Potential with Digital Universal Basic Income</h2>
                <p className="text-black/90 dark:text-black/80 max-w-2xl mx-auto">
                    Global inequality is the greatest challenge of our time. GoodDollar uses decentralized technology to financially empower millions around the globe.
                </p>
            </div>
            
            {/* Community Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-white dark:bg-black/90">
                <div className="flex flex-col items-center text-center p-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                        </svg>
                    </div>
                    <h3 className="font-medium text-black/90 dark:text-white/90">Global Reach</h3>
                    <p className="text-sm text-black/90 dark:text-white/90">Active in over 180 countries & territories worldwide</p>
                </div>
                
                <div className="flex flex-col items-center text-center p-3">
                    <div className="w-10 h-10 rounded-full bg-primary/30 dark:bg-primary/90 flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary/90 dark:text-primary/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h3 className="font-medium text-black/90 dark:text-white/90">Growing Community</h3>
                    <p className="text-sm text-black/90 dark:text-white/90">Over 600,000 people committed to economic inclusion</p>
                </div>
                
                <div className="flex flex-col items-center text-center p-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </div>
                    <h3 className="font-medium text-black/90 dark:text-white/90">Local Leaders</h3>
                    <p className="text-sm text-black/90 dark:text-white/90">20+ ambassadors representing their local communities</p>
                </div>
            </div>
            
            {/* Quick Links */}
            <div className="p-6 bg-black/90dark:bg-black/90/50">
                <div className="flex items-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-black/90 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="font-bold text-black/90 dark:text-white/90">Quick Links</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Link 
                        href="https://www.gooddollar.org/"
                        className="flex items-center p-3 rounded-lg bg-white dark:bg-black/90 hover:bg-black/90 dark:hover:bg-black/90 border border-black/90 dark:border-black/90"
                        target="_blank"
                    >
                        <span className="text-black/90 dark:text-white/90 text-sm font-medium">Get Started →</span>
                    </Link>
                    
                    <Link 
                        href="https://www.gooddollar.org/community/"
                        className="flex items-center p-3 rounded-lg bg-white dark:bg-black/90 hover:bg-black/90 dark:hover:bg-black/90 border border-black/90 dark:border-black/90"
                        target="_blank"
                    >
                        <span className="text-black/90 dark:text-white/90 text-sm font-medium">Find Your Community →</span>
                    </Link>
                    
                    <Link 
                        href="https://www.gooddollar.org/ambassadors/"
                        className="flex items-center p-3 rounded-lg bg-white dark:bg-black/90 hover:bg-black/90 dark:hover:bg-black/90 border border-black/90 dark:border-black/90"
                        target="_blank"
                    >
                        <span className="text-black/90 dark:text-white/90 text-sm font-medium">Become an Ambassador →</span>
                    </Link>
                    
                    <Link 
                        href="https://docs.gooddollar.org"
                        className="flex items-center p-3 rounded-lg bg-white dark:bg-black/90 hover:bg-black/90 dark:hover:bg-black/90 border border-black/90 dark:border-black/90"
                        target="_blank"
                    >
                        <span className="text-black/90 dark:text-white/90 text-sm font-medium">Documentation →</span>
                    </Link>
                </div>
            </div>
            
        
        </div>
    );
}