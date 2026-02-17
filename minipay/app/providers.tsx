"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
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
        const sessionId = ph.get_distinct_id() || crypto.randomUUID();
        ph.register({ session_id: sessionId });
        if (!ph.get_distinct_id()) {
          ph.reset(true);
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
  return (
    <SessionProvider session={session}>
      <WagmiProvider>
        <ThriftProvider>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </ThriftProvider>
      </WagmiProvider>
    </SessionProvider>
  );
}
