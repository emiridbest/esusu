"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { FrameContext } from "@farcaster/frame-node";
import sdk from "@farcaster/frame-sdk";

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
}

interface FarcasterContextType {
  context: FrameContext | null;
  user: FarcasterUser | null;
  isLoaded: boolean;
}

const FarcasterContext = createContext<FarcasterContextType>({
  context: null,
  user: null,
  isLoaded: false,
});

export const useFarcaster = () => {
  const context = useContext(FarcasterContext);
  if (!context) {
    throw new Error('useFarcaster must be used within a FarcasterProvider');
  }
  return context;
};

export const FarcasterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<FrameContext | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadContext = async () => {
      try {
        const frameContext = await sdk.context;
        if (frameContext) {
          setContext(frameContext as unknown as FrameContext);
        }
      } catch (error) {
        console.error('Failed to load Farcaster context:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadContext();
  }, []);

  const user = context?.user ? {
    fid: context.user.fid,
    username: context.user.username || '',
    displayName: context.user.displayName || '',
    pfpUrl: context.user.pfpUrl,
  } : null;

  return (
    <FarcasterContext.Provider value={{ context, user, isLoaded }}>
      {children}
    </FarcasterContext.Provider>
  );
};
