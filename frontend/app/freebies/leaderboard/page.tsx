"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Trophy, Copy, Check } from 'lucide-react';
import { useActiveAccount } from "thirdweb/react";

interface LeaderboardEntry {
    rank: number;
    walletAddress: string;
    txCount: number;
}

interface PeriodInfo {
    start: string;
    end: string;
    weekOffset: number;
}

function formatAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatPeriod(start: string, end: string): string {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = s.toLocaleDateString('en-US', opts);
    const endStr = e.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    return `${startStr} — ${endStr}`;
}

function RankDisplay({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-amber-500 font-bold">1st</span>;
    if (rank === 2) return <span className="text-neutral-400 font-bold">2nd</span>;
    if (rank === 3) return <span className="text-amber-700 font-bold">3rd</span>;
    return <span className="text-neutral-500 font-medium tabular-nums">{rank}th</span>;
}

export default function LeaderboardPage() {
    const account = useActiveAccount();
    const connectedWallet = account?.address?.toLowerCase() || '';

    const [weekOffset, setWeekOffset] = useState(0);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null);
    const [period, setPeriod] = useState<PeriodInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

    const handleCopy = (address: string) => {
        navigator.clipboard.writeText(address);
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 2000);
    };

    const fetchLeaderboard = useCallback(async (offset: number) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ week: String(offset) });
            if (connectedWallet) params.set('wallet', connectedWallet);

            const res = await fetch(`/api/leaderboard?${params}`);
            const data = await res.json();

            if (data.success) {
                setLeaderboard(data.leaderboard);
                setCurrentUser(data.currentUser);
                setPeriod(data.period);
            }
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
        } finally {
            setLoading(false);
        }
    }, [connectedWallet]);

    useEffect(() => {
        fetchLeaderboard(weekOffset);
    }, [weekOffset, fetchLeaderboard]);

    const isCurrentPeriod = weekOffset === 0;

    // Check if the connected user is in the top 20
    const connectedInTop20 = connectedWallet
        ? leaderboard.some((e) => e.walletAddress.toLowerCase() === connectedWallet)
        : false;

    return (
        <div className="max-w-2xl mx-auto space-y-4 mb-8">
            {/* Period navigator */}
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWeekOffset((w) => w - 1)}
                    className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                </Button>

                <div className="text-center">
                    {period ? (
                        <>
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {formatPeriod(period.start, period.end)}
                            </p>
                            {isCurrentPeriod && (
                                <p className="text-xs text-neutral-400">Current period</p>
                            )}
                        </>
                    ) : (
                        <Skeleton className="h-5 w-40" />
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWeekOffset((w) => w + 1)}
                    disabled={isCurrentPeriod}
                    className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>

            {/* Connected user's position (if outside top 20) */}
            {connectedWallet && currentUser && !connectedInTop20 && (
                <Card className="border border-neutral-900 dark:border-neutral-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-mono text-neutral-900 dark:text-neutral-100">
                                #{currentUser.rank}
                            </span>
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                You
                            </span>
                            <Badge variant="secondary" className="text-xs font-mono">
                                {formatAddress(currentUser.walletAddress)}
                            </Badge>
                        </div>
                        <span className="text-sm tabular-nums font-medium text-neutral-700 dark:text-neutral-300">
                            {currentUser.txCount} tx{currentUser.txCount !== 1 ? 's' : ''}
                        </span>
                    </CardContent>
                </Card>
            )}

            {/* Leaderboard table */}
            <Card className="border border-neutral-200 dark:border-neutral-800">
                <CardHeader className="pb-3 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-neutral-500" />
                        <CardTitle className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                            Top 20
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-4 space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-4 w-8" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                    <Skeleton className="h-4 w-12" />
                                </div>
                            ))}
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-neutral-500">No transactions recorded for this period.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-16 text-xs uppercase tracking-wider">Rank</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider">Wallet</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider">Transactions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leaderboard.map((entry) => {
                                    const isMe = connectedWallet && entry.walletAddress.toLowerCase() === connectedWallet;
                                    return (
                                        <TableRow
                                            key={entry.walletAddress}
                                            className={isMe ? 'bg-neutral-50 dark:bg-neutral-900' : ''}
                                        >
                                            <TableCell className="py-3">
                                                <RankDisplay rank={entry.rank} />
                                            </TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex items-center gap-2 group">
                                                    <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">
                                                        {formatAddress(entry.walletAddress)}
                                                    </span>
                                                    <button
                                                        onClick={() => handleCopy(entry.walletAddress)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                                                        title="Copy address"
                                                    >
                                                        {copiedAddress === entry.walletAddress ? (
                                                            <Check className="h-3 w-3 text-green-500" />
                                                        ) : (
                                                            <Copy className="h-3 w-3 text-neutral-300 hover:text-neutral-500 transition-colors" />
                                                        )}
                                                    </button>
                                                    {isMe && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                            You
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right py-3 tabular-nums font-medium text-neutral-700 dark:text-neutral-300">
                                                {entry.txCount}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
