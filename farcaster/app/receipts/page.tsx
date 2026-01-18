"use client";

import React from "react";
import { useMiniAppDimensions } from '@/hooks/useMiniAppDimensions';
import TransactionList from "@/components/TransactionList";

export default function ReceiptsPage() {
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
      <TransactionList />
    </div>
  );
}
