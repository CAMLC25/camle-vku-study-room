import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Global TanStack Query Client
 * Configured per VKU Cross-Platform Mobile App Development curriculum (Week 6, Slide 16)
 * - staleTime: 5 minutes (data remains fresh for 5 minutes)
 * - gcTime: 10 minutes (garbage collected from cache after 10 minutes)
 * - retry: 2
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
