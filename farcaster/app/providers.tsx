"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { FrameContext } from "@farcaster/frame-node";
import sdk, {AddFrame} from "@farcaster/frame-sdk";
import { FarcasterProvider } from "../context/farcaster/FarcasterContext";
import { ThriftProvider } from "../context/thrift/ThriftContext";

const WagmiProvider = dynamic(
  () => import("../components/providers/WagmiProvider"),
  {
    ssr: false,
  }
);

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      persistence: "memory",
      person_profiles: "identified_only",
      loaded: (ph) => {
        // Generate anonymous session ID without identifying
        const sessionId = ph.get_distinct_id() || crypto.randomUUID();
        ph.register({ session_id: sessionId });

        // Temporary distinct ID that will be aliased later
        if (!ph.get_distinct_id()) {
          ph.reset(true); // Ensure clean state
        }
      },
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
export function Providers({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<FrameContext>();
  const [addFrameResult, setAddFrameResult] = useState("");

 const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);
  
  useEffect(() => {
    const load = async () => {
      try {
        const frameContext = await sdk.context;
        if (!frameContext) {
          return;
        }

        setContext(frameContext as unknown as FrameContext);
        setIsSDKLoaded(true);
      } catch (error) {
        console.error('Failed to load frame context:', error);
      }
    };
    
    if (sdk && !isSDKLoaded) {
      const initializeSDK = async () => {
        try {
          console.log('[DEBUG] Initializing SDK...');
          await load();
        } catch (error) {
          console.error('[DEBUG] Failed to load frame context:', error);
        } finally {
          // Always call ready, even if load fails or frameContext is missing
          try {
            console.log('[DEBUG] Calling sdk.actions.ready()...');
            await sdk.actions.ready();
            console.log('[DEBUG] sdk.actions.ready() called successfully versioning check.');
          } catch (error) {
            console.error('[DEBUG] Failed to call sdk.actions.ready():', error);
          }
        }
      };

      initializeSDK();

      return () => {
        console.log('[DEBUG] Cleaning up SDK listeners.');
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  // Separate effect to handle frame adding after context is loaded
  useEffect(() => {
    if (context && !context?.client?.added) {
      addFrame();
    }
  }, [context, addFrame]);

  useEffect(() => {
    if (!context?.user?.fid || !posthog?.isFeatureEnabled) return;

    const fidId = `fc_${context?.user?.fid}`;
    const currentId = posthog.get_distinct_id();

    // Skip if already identified with this FID
    if (currentId === fidId) return;

    // Create alias from session ID → FID
    posthog.alias(fidId, currentId);

    // Identify future events with FID
    posthog.identify(fidId, {
      farcaster_username: context.user?.username,
      farcaster_display_name: context.user?.displayName,
      farcaster_fid: context.user?.fid,
    });
  }, [context?.user]); // Only runs when FID changes

  return (
    <SessionProvider session={session}>
      <FarcasterProvider>
        <WagmiProvider>
          <ThriftProvider>
            <PostHogProvider>
                {children}
            </PostHogProvider>
          </ThriftProvider>
        </WagmiProvider>
      </FarcasterProvider>
    </SessionProvider>
  );
}
