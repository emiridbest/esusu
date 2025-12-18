"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck, Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrustScoreProps {
    score: number; // 0-100
    factors: {
        label: string;
        value: string;
        status: 'good' | 'neutral' | 'bad';
    }[];
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function TrustScore({ score, factors, size = 'md', className }: TrustScoreProps) {
    // Determine color based on score
    let colorClass = "text-red-500 border-red-500 bg-red-500/10";
    let label = "Low Trust";

    if (score >= 80) {
        colorClass = "text-green-500 border-green-500 bg-green-500/10";
        label = "High Trust";
    } else if (score >= 50) {
        colorClass = "text-yellow-500 border-yellow-500 bg-yellow-500/10";
        label = "Medium Trust";
    }

    const sizeClasses = {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-3 py-1",
        lg: "text-base px-4 py-2",
    };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className={cn(
                            "flex items-center gap-2 rounded-full border cursor-help transition-all hover:bg-opacity-20",
                            colorClass,
                            sizeClasses[size]
                        )}>
                            <ShieldCheck className="h-4 w-4" />
                            <span className="font-bold">{score}/100</span>
                            <span className="font-medium opacity-80 border-l border-current pl-2 ml-1">{label}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent className="p-4 w-64 bg-background/95 backdrop-blur border shadow-xl">
                        <div className="space-y-3">
                            <h4 className="font-semibold text-sm flex items-center gap-2 pb-2 border-b">
                                <ShieldCheck className="h-4 w-4" />
                                Trust Score Analysis
                            </h4>
                            <div className="space-y-2">
                                {factors.map((factor, idx) => (
                                    <div key={idx} className="flex justify-between text-sm items-center">
                                        <span className="text-muted-foreground">{factor.label}</span>
                                        <span className={cn(
                                            "font-medium px-2 py-0.5 rounded text-xs",
                                            factor.status === 'good' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                            factor.status === 'neutral' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                                            factor.status === 'bad' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        )}>
                                            {factor.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
