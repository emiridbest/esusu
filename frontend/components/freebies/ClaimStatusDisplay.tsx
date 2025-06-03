"use client";

import React from 'react';
import { Loader2 } from "lucide-react";

interface ClaimStatusDisplayProps {
    isLoading: boolean;
    canClaim: boolean;
    timeRemaining: string;
}

export default function ClaimStatusDisplay({
    isLoading,
    canClaim,
    timeRemaining,

}: ClaimStatusDisplayProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Checking eligibility...</span>
            </div>
        );
    }
    
    if (!canClaim) {
        return (
            <div className="text-center py-4 space-y-2">
                <p className="text-xl font-semibold">Next claim available in:</p>
                <p className="text-2xl font-bold text-primary">{timeRemaining}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    You have already claimed your free bundle for today
                </p>
            </div>
        );
    }
    
    return null;
}
