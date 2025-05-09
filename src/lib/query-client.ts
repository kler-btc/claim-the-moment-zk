
import { QueryClient } from '@tanstack/react-query';

/**
 * Creates and configures a QueryClient instance with default options
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  });
}
