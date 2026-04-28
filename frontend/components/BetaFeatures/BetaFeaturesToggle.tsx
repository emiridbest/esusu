"use client";
import React from "react";
import { Switch } from "@/components/ui/switch";
import { useBetaFeatures } from "@/context/BetaFeaturesContext";

export default function BetaFeaturesToggle() {
  const { enabled, setEnabled } = useBetaFeatures();
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30 max-w-md">
      <span className="font-medium text-lg">Turn on Beta Features</span>
      <Switch checked={enabled} onCheckedChange={setEnabled} />
      <span className={`ml-2 text-sm font-semibold ${enabled ? "text-green-600" : "text-gray-400"}`}>
        {enabled ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}
