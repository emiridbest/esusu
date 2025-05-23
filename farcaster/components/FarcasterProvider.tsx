"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { sdk as originalSdk } from '@farcaster/frame-sdk';

/**
 * Initializes a patched version of the Farcaster SDK with additional error handling
 * and compatibility improvements.
 * @returns The patched Farcaster SDK instance
 */
export const initPatchedFarcasterSdk = () => {
    // Create a proxy around the original SDK to add error handling
    const patchedSdk = {
        ...originalSdk,
        
        // Enhanced actions with better error handling
        actions: {
            ...originalSdk.actions,
            
            // Override methods that might need patching
            viewProfile: async (options: any) => {
                try {
                    return await originalSdk.actions.viewProfile(options);
                } catch (error) {
                    console.warn('Patched SDK: Error in viewProfile:', error);
                    // Return minimal user object in case of failure
                    return { fid: 0, username: 'unknown' };
                }
            },

            ready: async () => {
                try {
                    return await originalSdk.actions.ready();
                } catch (error) {
                    console.warn('Patched SDK: Error in ready method:', error);
                    return false;
                }
            }
        },
        
        // Add compatibility methods and fixes
        isInMiniApp: async () => {
            try {
                // Check if we're in a Farcaster environment
                if (typeof window !== 'undefined' && 
                        window.location.hostname.includes('farcaster')) {
                    return true;
                }
                return await originalSdk.isInMiniApp();
            } catch (error) {
                console.warn('Patched SDK: Error checking if in mini app:', error);
                return false;
            }
        }
    };

    return patchedSdk;
};

// Export the original SDK for cases where it's needed directly
export const sdk = originalSdk;
import posthog from 'posthog-js';

interface FarcasterContextType {
  isInMiniApp: boolean;
  isReady: boolean;
  fid?: number;
  username?: string;
  ethereum?: any;
  hideSplashScreen: () => void;
  composeCast: (options: { text: string; embeds?: { url: string }[] }) => Promise<void>;
  addMiniApp: () => Promise<void>;
  openUrl: (url: string) => Promise<void>;
  closeApp: () => Promise<void>;
}

const FarcasterContext = createContext<FarcasterContextType>({
  isInMiniApp: false,
  isReady: false,
  hideSplashScreen: () => {},
  composeCast: async () => {},
  addMiniApp: async () => {},
  openUrl: async () => {},
  closeApp: async () => {},
});

export const useFarcaster = () => useContext(FarcasterContext);

interface FarcasterProviderProps {
  children: ReactNode;
}

interface FarcasterUser {
  fid: number;
  username: string;
  displayName?: string;
}

export function FarcasterProvider({ children }: FarcasterProviderProps) {  const [isInMiniApp, setIsInMiniApp] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [fid, setFid] = useState<number | undefined>(undefined);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [ethereum, setEthereum] = useState<any>(undefined);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if running in a Mini App
        const inMiniApp = await sdk.isInMiniApp();
        console.log('Is in Mini App:', inMiniApp);
        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          // Get user info if available
          try {
            // Cast the response to our interface to handle typing issues
            const user = await sdk.actions.viewProfile({fid: 0}) as unknown as FarcasterUser;
            if (user && user.fid) {
              setFid(user.fid);
              setUsername(user.username);
              
              // Identify in PostHog
              posthog.identify(`fc_${user.fid}`, {
                farcaster_username: user.username,
                farcaster_fid: user.fid,
              });
              
              // Track mini app open event
              posthog.capture('miniapp_opened', {
                fid: user.fid,
                username: user.username
              });
            }
          } catch (err) {
            console.error('Error getting user info:', err);
          }

          // Initialize Ethereum provider
          try {
            const provider =  sdk.wallet.ethProvider;
            setEthereum(provider);
          } catch (err) {
            console.error('Error initializing Ethereum provider:', err);
          }
        }

        // Mark as ready
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing Farcaster SDK:', error);
        setIsReady(true); // Still mark as ready so the app can continue
      }    };

    initialize();
  }, []);

  // Define functions for mini app actions
  const hideSplashScreen = async () => {
    if (isInMiniApp) {
      try {
        await sdk.actions.ready();
        posthog.capture('splash_screen_hidden');
      } catch (err) {
        console.error('Error hiding splash screen:', err);
      }
    }
  };

  const composeCast = async (options: { text: string; embeds?: { url: string }[] }) => {
    if (isInMiniApp) {
      try {
        // Transform the embeds to the format expected by the SDK
        const sdkOptions = {
          text: options.text,
          embeds: options.embeds ? options.embeds.map(embed => embed.url) : undefined
        };
        await sdk.actions.composeCast(sdkOptions as any);
        posthog.capture('cast_composed', {
          text_length: options.text.length,
          has_embeds: options.embeds && options.embeds.length > 0
        });
      } catch (err) {
        console.error('Error composing cast:', err);
      }
    }
  };

  const addMiniApp = async () => {
    if (isInMiniApp) {
      try {
        await sdk.actions.addFrame();
        posthog.capture('mini_app_added');
      } catch (err) {
        console.error('Error adding mini app:', err);
      }
    }
  };

  const openUrl = async (url: string) => {
    if (isInMiniApp) {
      try {
        await sdk.actions.openUrl(url);
        posthog.capture('url_opened', { url });
      } catch (err) {
        console.error('Error opening URL:', err);
      }
    }
  };

  const closeApp = async () => {
    if (isInMiniApp) {
      try {
        if ('close' in sdk) {
          await (sdk as any).close();
          posthog.capture('app_closed');
        }
      } catch (err) {
        console.error('Error closing app:', err);
      }
    }
  };

  const value = {
    isInMiniApp,
    isReady,
    fid,
    username,
    ethereum,
    hideSplashScreen,
    composeCast,
    addMiniApp,
    openUrl,
    closeApp,
  };

  return (
    <FarcasterContext.Provider value={value}>
      {children}
    </FarcasterContext.Provider>
  );
}
