import { useCallback, useEffect, useMemo, useState } from "react";
import * as session from "./workosSession";

/**
 * Adapter between our WorkOS session store and `ConvexProviderWithAuth`.
 *
 * `ConvexProviderWithAuth` expects a React hook that returns:
 *   - isLoading: true while we are bootstrapping / refreshing
 *   - isAuthenticated: does the client have a valid access token?
 *   - fetchAccessToken: callback that returns a fresh JWT or null
 *
 * Our session store exposes a minimal pub/sub, so we subscribe here and
 * translate it into React state. `forceRefreshToken` is passed straight to
 * `getAccessToken`, so Convex retries after 401 will trigger a refresh.
 */
export function useConvexAuthFromAuthKit() {
  const [current, setCurrent] = useState(() => session.getSession());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = session.subscribe((next) => {
      setCurrent(next);
    });
    return unsub;
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!session.getSession()) return null;
      setLoading(true);
      try {
        return await session.getAccessToken(forceRefreshToken);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return useMemo(
    () => ({
      isLoading: loading,
      isAuthenticated: current !== null,
      fetchAccessToken,
    }),
    [loading, current, fetchAccessToken],
  );
}
