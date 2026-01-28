import { useState, useEffect, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useServerTime() {
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // REST API: GET /server-time
  const syncTime = useCallback(async () => {
    try {
      const clientBefore = Date.now();
      const response = await fetch(`${API_URL}/server-time`);
      const clientAfter = Date.now();

      if (!response.ok) {
        throw new Error('Failed to fetch server time');
      }

      const { serverTime } = await response.json();
      const serverTimeMs = new Date(serverTime).getTime();
      const roundTripTime = clientAfter - clientBefore;
      const estimatedServerTime = serverTimeMs + roundTripTime / 2;
      const offset = estimatedServerTime - clientAfter;

      setServerTimeOffset(offset);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to sync server time:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncTime();
    // Re-sync every 30 seconds
    const interval = setInterval(syncTime, 30000);
    return () => clearInterval(interval);
  }, [syncTime]);

  const getServerTime = useCallback(() => {
    return new Date(Date.now() + serverTimeOffset);
  }, [serverTimeOffset]);

  return { getServerTime, serverTimeOffset, isLoading };
}
