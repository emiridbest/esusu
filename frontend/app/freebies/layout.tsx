"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const tabs = [
    { label: 'Claim', href: '/freebies/claim' },
    { label: 'Rewards', href: '/freebies/rewards' },
    { label: 'Leaderboard', href: '/freebies/leaderboard' },
];

export default function FreebiesLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Determine active tab — default to claim if at /freebies root
    const activeHref = tabs.find((t) => pathname.startsWith(t.href))?.href || '/freebies/claim';

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Navigation */}
            <nav className="flex items-center border-b border-neutral-200 dark:border-neutral-800">
                {tabs.map((tab) => {
                    const isActive = activeHref === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cn(
                                "px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                                isActive
                                    ? "border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100"
                                    : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                            )}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Page content */}
            <div>{children}</div>
        </div>
    );
}
