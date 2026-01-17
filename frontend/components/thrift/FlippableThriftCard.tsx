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
        e.preventDefault(); // Prevent Link click if nested (though it shouldn't be here)
        e.stopPropagation();
        onShare(group);
    };

    return (
        <div className="relative w-full h-[320px] perspective-1000">
            <div
                className={cn(
                    "relative w-full h-full transition-all duration-500 transform preserve-3d",
                    isFlipped ? "rotate-y-180" : ""
                )}
                style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
                {/* Front of Card */}
                <Card
                    className="absolute w-full h-full backface-hidden overflow-hidden border border-border bg-card"
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
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-2 left-3">
                                <Badge className="bg-primary text-black font-semibold">
                                    {parseFloat(group.depositAmount)} {group.tokenSymbol || 'cUSD'}
                                </Badge>
                            </div>
                        </div>
                    )}

                    <CardHeader className={cn("pb-2", !group.meta?.coverImageUrl && "bg-primary/5 pt-4")}>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                {!group.meta?.coverImageUrl && (
                                    <Badge variant="outline" className="mb-2 border-primary/20 text-primary">
                                        {parseFloat(group.depositAmount)} {group.tokenSymbol || 'cUSD'}
                                    </Badge>
                                )}
                                <CardTitle className="text-lg font-bold leading-tight line-clamp-1">{group.name}</CardTitle>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-2">
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2 min-h-[2.5em]">
                            {group.description || "No description provided."}
                        </p>

                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <UsersIcon className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium">{group.totalMembers}/{group.maxMembers} members</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium">{group.isActive ? 'Active Cycle' : 'Formation Phase'}</span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="absolute bottom-0 w-full border-t border-border/50 p-3 bg-muted/5 flex justify-between items-center">
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-8 px-2"
                                onClick={handleShare}
                            >
                                <Share2Icon className="h-3.5 w-3.5 mr-1" />
                                Share
                            </Button>
                            {isCreator && (
                                <Button size="sm" variant="ghost" className="text-xs h-8 px-2" onClick={() => onEdit(group)}>
                                    Edit
                                </Button>
                            )}
                        </div>
                        <Link href={`/thrift/${group.id}`} passHref>
                            <Button
                                size="sm"
                                className="text-xs h-8 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            >
                                View
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>

                {/* Back of Card */}
                <Card
                    className="absolute w-full h-full backface-hidden overflow-hidden border border-border bg-card"
                    style={{
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden',
                        zIndex: isFlipped ? 1 : 0
                    }}
                >
                    <CardHeader className="bg-primary/5 pb-3">
                        <CardTitle className="text-base font-bold flex items-center justify-between">
                            <span>{group.name} Members</span>
                            <Badge variant="secondary" className="text-xs">
                                {isLoading ? (
                                    <span className="w-8 h-4 bg-muted animate-pulse rounded block"></span>
                                ) : (
                                    `${members.length}/${group.maxMembers}`
                                )}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto h-[calc(100%-60px)]">
                        {isLoading ? (
                            <ul className="divide-y divide-border">
                                {[1, 2, 3].map((_, idx) => (
                                    <li key={idx} className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
                                            <div className="flex flex-col gap-1 w-full max-w-[120px]">
                                                <div className="h-3 w-20 bg-muted animate-pulse rounded"></div>
                                                <div className="h-2 w-16 bg-muted animate-pulse rounded"></div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : members.length > 0 ? (
                            <ul className="divide-y divide-border">
                                {members.map((member, idx) => (
                                    <li key={idx} className="flex items-center justify-between p-3 hover:bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                                                {member.userName ? member.userName.charAt(0).toUpperCase() : 'M'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{member.userName || `Member ${idx + 1}`}</span>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {member.address.substring(0, 6)}...{member.address.substring(member.address.length - 4)}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                                <UsersIcon className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm">No members found</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
