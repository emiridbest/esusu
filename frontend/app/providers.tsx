"use client";

import { ReactNode } from "react";
import { ClaimProvider } from "@/context/utilityProvider/ClaimContextProvider";
import { ThriftProvider } from "@/context/thrift/ThriftContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThirdwebProvider } from "thirdweb/react";
import { client, activeChain } from "@/lib/thirdweb";

// Thirdweb setup with social login support
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThirdwebProvider>
      <QueryClientProvider client={queryClient}>
        <ClaimProvider>
          <ThriftProvider>
            {children}
          </ThriftProvider>
        </ClaimProvider>
      </QueryClientProvider>
    </ThirdwebProvider>
  );
}