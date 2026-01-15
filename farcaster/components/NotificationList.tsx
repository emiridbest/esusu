"use client";

import React from "react";
import { Bell, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMiniAppDimensions } from '@/hooks/useMiniAppDimensions';

export default function NotificationList() {
    // Placeholder data - in a real app, this would come from an API or local storage
    const notifications: any[] = [];

    return (
        <Card className="border shadow-sm bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardHeader className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-semibold flex items-center">
                            Notifications
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Stay updated with your account activity
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {notifications.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="mx-auto bg-muted rounded-full h-12 w-12 flex items-center justify-center mb-4">
                            <Bell className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium mb-1">No new notifications</p>
                        <p className="text-xs text-muted-foreground">
                            We&apos;ll notify you when something important happens
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* List implementation would go here */}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
