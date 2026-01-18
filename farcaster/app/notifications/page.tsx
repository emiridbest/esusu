"use client";

import React from "react";
import { useMiniAppDimensions } from '@/hooks/useMiniAppDimensions';
import NotificationList from "@/components/NotificationList";

export default function NotificationsPage() {
    const dimensions = useMiniAppDimensions();

    return (
        <div
            className={`${dimensions.containerClass} mx-auto px-4 py-6 overflow-auto`}
            style={{
                width: dimensions.width,
                height: dimensions.height,
                maxWidth: dimensions.maxWidth,
            }}
        >
            <NotificationList />
        </div>
    );
}
