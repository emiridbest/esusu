"use client";

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThriftGroup } from '@/context/thrift/ThriftContext';
import { UsersIcon, CalendarIcon, Share2Icon, WalletIcon } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming global utility for class merging

interface ThriftGroupCardProps {
    group: ThriftGroup;
    currentUserAddress: string | null;
    onJoin?: (group: ThriftGroup) => void;
    onShare: (group: ThriftGroup) => void;
    onEdit: (group: ThriftGroup) => void;
    variant?: 'discovery' | 'manage';
    onManage?: (group: ThriftGroup) => void;
}

export function ThriftGroupCard({ group, currentUserAddress, onJoin, onShare, onEdit, variant = 'discovery', onManage }: ThriftGroupCardProps) {
    const isCreator = currentUserAddress && group.meta?.createdBy && currentUserAddress.toLowerCase() === String(group.meta.createdBy).toLowerCase();

    return (
        <Card className={cn(
            "overflow-hidden transition-all duration-500 group relative",
            "border border-border/40 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 dark:border-white/10 dark:hover:border-primary/30",
            "bg-white/90 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-black backdrop-blur-md",
            group.isActive ? "dark:border-white/10" : "opacity-90"
        )}>
            {group.meta?.coverImageUrl && (
                <div className="relative h-40 overflow-hidden">
                    <img
                        src={group.meta.coverImageUrl}
                        alt={group.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                        <Badge className="bg-primary text-black font-bold tracking-wide hover:bg-primary/90 shadow-lg border-0 backdrop-blur-md">
                            {parseFloat(group.depositAmount)} {group.tokenSymbol || 'cUSD'}
                        </Badge>
                    </div>
                </div>
            )}

            <CardHeader className={cn("pb-2 relative z-10", !group.meta?.coverImageUrl && "bg-gradient-to-b from-primary/5 to-transparent dark:from-white/5 pt-6")}>
                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                        {!group.meta?.coverImageUrl && (
                            <Badge variant="outline" className="mb-2 border-primary/30 text-primary bg-primary/5 dark:bg-primary/10">
                                {parseFloat(group.depositAmount)} {group.tokenSymbol || 'cUSD'}
                            </Badge>
                        )}
                        <CardTitle className="text-lg font-bold leading-tight group-hover:text-primary transition-colors duration-300">{group.name}</CardTitle>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-2 relative z-10">
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2 min-h-[2.5em] dark:text-gray-400">
                    {group.description || "No description provided."}
                </p>

                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-muted/50 dark:hover:bg-white/10 transition-colors">
                        <UsersIcon className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-foreground/80 dark:text-gray-300">{group.totalMembers}/{group.maxMembers} members</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-muted/50 dark:hover:bg-white/10 transition-colors">
                        <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-foreground/80 dark:text-gray-300">{group.isActive ? 'Active Cycle' : 'Formation Phase'}</span>
                    </div>
                    {group.meta?.category && (
                        <div className="flex items-center gap-1.5 col-span-2">
                            <span className="px-2 py-0.5 rounded-full bg-secondary/50 dark:bg-white/10 text-secondary-foreground text-[10px] uppercase font-semibold tracking-wider border border-white/5">
                                {group.meta.category}
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="border-t border-border/40 dark:border-white/5 pt-3 flex justify-between bg-muted/30 dark:bg-black/40 backdrop-blur-md relative z-10">
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all rounded-full"
                        onClick={() => onShare(group)}
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

                <Button
                    size="sm"
                    className={cn(
                        "text-xs font-bold shadow-md hover:shadow-primary/20 rounded-full transition-all duration-300 transform hover:scale-105",
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        "dark:text-black", // Ensure text contrast on yellow in dark mode
                        variant === 'manage' && "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                    onClick={() => variant === 'manage' ? onManage?.(group) : onJoin?.(group)}
                    disabled={variant === 'discovery' && group.totalMembers >= group.maxMembers}
                >
                    {variant === 'manage' ? 'Manage Group' : (group.totalMembers >= group.maxMembers ? 'Full Capacity' : 'Join Group')}
                </Button>
            </CardFooter>
        </Card>
    );
}
