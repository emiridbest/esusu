"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { CalculatorIcon, TrendingUpIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface YieldCalculatorProps {
    depositToken: string;
    defaultAmount?: number;
    APY?: number; // Annual Percentage Yield in %
}

export function YieldCalculator({ depositToken, defaultAmount = 100, APY = 5 }: YieldCalculatorProps) {
    const [amount, setAmount] = useState<number>(defaultAmount);
    const [months, setMonths] = useState<number>(12);

    // Simple APY calculation
    const estimatedEarnings = (amount * (APY / 100) * (months / 12));
    const total = amount + estimatedEarnings;

    return (
        <Card className="bg-gradient-to-br from-background to-secondary/10 border-primary/20 shadow-lg overflow-hidden">
            <CardHeader className="pb-2 bg-primary/5">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                    <CalculatorIcon className="h-4 w-4" />
                    Yield Projector
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Deposit ({depositToken})</label>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-muted-foreground">$</span>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="text-lg font-bold border-none bg-transparent shadow-none p-0 h-auto focus-visible:ring-0"
                            />
                        </div>
                        <Slider
                            value={[amount]}
                            max={10000}
                            step={10}
                            onValueChange={(v) => setAmount(v[0])}
                            className="py-2"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Duration ({months} months)</label>
                        <Slider
                            value={[months]}
                            min={1}
                            max={36}
                            step={1}
                            onValueChange={(v) => setMonths(v[0])}
                        />
                    </div>
                </div>

                <div className="bg-background/50 rounded-lg p-4 border border-border/50">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Projected Return</p>
                            <div className="text-2xl font-bold flex items-center text-green-500">
                                <TrendingUpIcon className="h-5 w-5 mr-2" />
                                +{estimatedEarnings.toFixed(2)} {depositToken}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                            <p className="text-lg font-semibold">{total.toFixed(2)} {depositToken}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
