import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1 * 60 * 1000, // 1 minute - data stays fresh
            gcTime: 10 * 60 * 1000, // 10 minutes - cache time (formerly cacheTime)
            refetchOnWindowFocus: false, // Don't refetch on window focus
            refetchOnMount: false, // Don't refetch on component mount if data exists
            retry: 1, // Only retry failed requests once
        },
    },
});
