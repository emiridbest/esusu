"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThriftGroup, ThriftMember } from '@/context/thrift/ThriftContext';
import { UsersIcon, CalendarIcon, Share2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface FlippableThriftCardProps {
    group: ThriftGroup;
    currentUserAddress: string | null;
    isFlipped: boolean;
    onShare: (group: ThriftGroup) => void;
    onEdit: (group: ThriftGroup) => void;
    members: ThriftMember[];
    isLoading?: boolean;
}

export function FlippableThriftCard({ group, currentUserAddress, isFlipped, onShare, onEdit, members, isLoading }: FlippableThriftCardProps) {
    const isCreator = currentUserAddress && group.meta?.createdBy && currentUserAddress.toLowerCase() === String(group.meta.createdBy).toLowerCase();
    const router = useRouter();

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onShare(group);
    };

    return (
        <div className="relative w-full h-[320px] perspective-1000 group/card">
            <div
                className={cn(
                    "relative w-full h-full transition-all duration-500 transform preserve-3d",
                    isFlipped ? "rotate-y-180" : ""
                )}
                style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
                {/* Front of Card */}
                <Card
                    className="absolute w-full h-full backface-hidden overflow-hidden border border-border/40 dark:border-white/10 bg-card dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-black text-card-foreground shadow-sm dark:shadow-2xl hover:shadow-xl dark:hover:shadow-primary/5 hover:border-primary/20 dark:hover:border-primary/30 transition-all duration-500 group-hover/card:translate-y-[-2px]"
                    style={{
                        backfaceVisibility: 'hidden',
                        zIndex: isFlipped ? 0 : 1
                    }}
                >
                    {group.meta?.coverImageUrl && (
                        <div className="relative h-32 overflow-hidden">
                            <img
                                src={group.meta.coverImageUrl}
                                alt={group.name}
                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                            <div className="absolute bottom-3 left-3">
                                <Badge className="bg-primary/90 text-primary-foreground hover:bg-primary font-bold tracking-wide backdrop-blur-md shadow-lg border-0">
                                    {parseFloat(group.depositAmount)} {group.tokenSymbol || 'cUSD'}
                                </Badge>
                            </div>
                        </div>
                    )}

                    <CardHeader className={cn("pb-2 relative z-10", !group.meta?.coverImageUrl && "bg-gradient-to-b from-muted/30 to-transparent dark:from-white/5 pt-5")}>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1 w-full">
                                {!group.meta?.coverImageUrl && (
                                    <Badge variant="outline" className="mb-2 border-primary/30 text-primary bg-primary/5 dark:bg-primary/10">
                                        {parseFloat(group.depositAmount)} {group.tokenSymbol || 'cUSD'}
                                    </Badge>
                                )}
                                <CardTitle className="text-lg font-bold leading-tight line-clamp-1 text-foreground tracking-tight group-hover/card:text-primary transition-colors duration-300">
                                    {group.name}
                                </CardTitle>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-2 relative z-10">
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2 min-h-[2.5em] leading-relaxed dark:text-gray-400">
                            {group.description || "No description provided."}
                        </p>

                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted/50 dark:hover:bg-white/10 transition-colors border border-transparent dark:hover:border-primary/20">
                                <UsersIcon className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium text-foreground/80 dark:text-gray-300">{group.totalMembers}/{group.maxMembers} members</span>
                            </div>
                            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted/50 dark:hover:bg-white/10 transition-colors border border-transparent dark:hover:border-primary/20">
                                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium text-foreground/80 dark:text-gray-300">{group.isActive ? 'Active Cycle' : 'Formation Phase'}</span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="absolute bottom-0 w-full border-t border-border/40 dark:border-white/5 p-3 bg-muted/30 dark:bg-black/40 backdrop-blur-md flex justify-between items-center z-20">
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all rounded-full"
                                onClick={handleShare}
                            >
                                <Share2Icon className="h-3.5 w-3.5 mr-1" />
                                Share
                            </Button>
                            {isCreator && (
                                <Button size="sm" variant="ghost" className="text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all rounded-full" onClick={() => onEdit(group)}>
                                    Edit
                                </Button>
                            )}
                        </div>
                        <Link href={`/thrift/${group.id}`} passHref>
                            <Button
                                size="sm"
                                className="text-xs h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md hover:shadow-primary/20 rounded-full transition-all duration-300 transform hover:scale-105"
                            >
                                View
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>

                {/* Back of Card */}
                <Card
                    className="absolute w-full h-full backface-hidden overflow-hidden border border-border/40 dark:border-white/10 bg-card dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-black text-card-foreground shadow-sm dark:shadow-2xl"
                    style={{
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden',
                        zIndex: isFlipped ? 1 : 0
                    }}
                >
                    <CardHeader className="bg-gradient-to-b from-muted/30 to-transparent dark:from-white/5 pb-4 border-b border-border/40 dark:border-white/5 relative z-10">
                        <CardTitle className="text-base font-bold flex items-center justify-between text-foreground tracking-tight">
                            <span>{group.name} Members</span>
                            <Badge variant="secondary" className="text-xs bg-background/50 dark:bg-white/10 backdrop-blur-md border border-border/40 dark:border-white/10 shadow-sm">
                                {isLoading ? (
                                    <span className="w-8 h-4 bg-muted animate-pulse rounded block"></span>
                                ) : (
                                    `${members.length}/${group.maxMembers}`
                                )}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto h-[calc(100%-60px)] scrollbar-thin scrollbar-thumb-muted/50 dark:scrollbar-thumb-white/10 scrollbar-track-transparent relative z-10">
                        {isLoading ? (
                            <ul className="divide-y divide-border/40 dark:divide-white/5">
                                {[1, 2, 3].map((_, idx) => (
                                    <li key={idx} className="flex items-center justify-between p-3 animate-pulse">
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="w-8 h-8 rounded-full bg-muted/50 dark:bg-white/10"></div>
                                            <div className="flex flex-col gap-2 w-full max-w-[120px]">
                                                <div className="h-3 w-24 bg-muted/50 dark:bg-white/10 rounded"></div>
                                                <div className="h-2 w-16 bg-muted/50 dark:bg-white/10 rounded"></div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : members.length > 0 ? (
                            <ul className="divide-y divide-border/40 dark:divide-white/5">
                                {members.map((member, idx) => (
                                    <li key={idx} className="flex items-center justify-between p-3 hover:bg-muted/50 dark:hover:bg-white/5 transition-colors duration-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary text-xs font-bold ring-1 ring-primary/20 dark:ring-primary/30 shadow-sm">
                                                {member.userName ? member.userName.charAt(0).toUpperCase() : 'M'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-foreground dark:text-gray-200">{member.userName || `Member ${idx + 1}`}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 dark:bg-white/5 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                                    {member.address.substring(0, 6)}...{member.address.substring(member.address.length - 4)}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center space-y-2">
                                <UsersIcon className="h-10 w-10 text-muted-foreground/20 dark:text-white/10" />
                                <p className="text-sm font-medium">No members yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
