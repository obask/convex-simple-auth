/**
 * Client-side token store + React hook for `ConvexProviderWithAuth`.
 *
 *   import { ConvexProviderWithAuth } from "convex/react";
 *   import { useAuth } from "convex-simple-auth/react";
 *
 *   <ConvexProviderWithAuth client={convex} useAuth={useAuth}>
 *     ...
 *   </ConvexProviderWithAuth>
 */
import { useCallback, useSyncExternalStore } from "react";

const KEY = "convex_jwt";
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) emit();
  });
}

export const tokenStore = {
  get: (): string | null =>
    typeof window === "undefined" ? null : window.localStorage.getItem(KEY),
  set: (token: string) => {
    window.localStorage.setItem(KEY, token);
    emit();
  },
  clear: () => {
    window.localStorage.removeItem(KEY);
    emit();
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useAuth() {
  const token = useSyncExternalStore(subscribe, tokenStore.get, () => null);
  const fetchAccessToken = useCallback(async () => token, [token]);
  return {
    isLoading: false,
    isAuthenticated: token !== null,
    fetchAccessToken,
  };
}
