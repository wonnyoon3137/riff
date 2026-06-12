"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "@/components/common/Toast";
import { DEFAULT_QUERY_OPTIONS } from "@/lib/query-config";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // 캐시 값/근거는 src/lib/query-config.ts (data-model §7.3 + kopis 캐싱 권장).
      queries: DEFAULT_QUERY_OPTIONS,
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
