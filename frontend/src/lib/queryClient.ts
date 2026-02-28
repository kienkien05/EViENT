import { QueryClient } from '@tanstack/react-query'

// React Query client with default caching strategy
// Extracted to its own module to avoid circular dependencies
// (authStore needs to clear cache on logout, but main.tsx imports App which imports authStore)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,    // 2 minutes
      gcTime: 10 * 60 * 1000,       // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
