import { useEffect, useRef } from 'react';

interface UseAutoRefreshOptions {
  interval?: number; // milliseconds, default 10000
  enabled?: boolean; // default true
}

/**
 * Automatically refetch data at specified interval
 *
 * @param fetchFn - Function to call for refetching data
 * @param options - Configuration options
 */
export function useAutoRefresh(
  fetchFn: () => Promise<void> | void,
  options: UseAutoRefreshOptions = {}
): void {
  const { interval = 10000, enabled = true } = options;
  const fetchFnRef = useRef(fetchFn);

  // Update ref when fetchFn changes
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) return;

    const timer = setInterval(() => {
      fetchFnRef.current();
    }, interval);

    return () => clearInterval(timer);
  }, [interval, enabled]);
}
