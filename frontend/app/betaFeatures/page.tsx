"use client";
import React, { useState } from "react";
import BetaFeaturesToggle from "@/components/BetaFeatures/BetaFeaturesToggle";

export default function BetaFeaturesPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Beta Features</h1>
      <BetaFeaturesToggle />
      {/* Render beta features here based on toggle state */}
    </div>
  );
}
