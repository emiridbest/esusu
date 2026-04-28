"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

interface BetaFeaturesContextType {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
}

const BetaFeaturesContext = createContext<BetaFeaturesContextType | undefined>(undefined);

export const BetaFeaturesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enabled, setEnabled] = useState(false);

  // Persist toggle in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("betaFeaturesEnabled");
    if (stored) setEnabled(stored === "true");
  }, []);
  useEffect(() => {
    localStorage.setItem("betaFeaturesEnabled", String(enabled));
  }, [enabled]);

  return (
    <BetaFeaturesContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </BetaFeaturesContext.Provider>
  );
};

export function useBetaFeatures() {
  const ctx = useContext(BetaFeaturesContext);
  if (!ctx) throw new Error("useBetaFeatures must be used within BetaFeaturesProvider");
  return ctx;
}
