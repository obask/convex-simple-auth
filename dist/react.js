/**
 * React binding for the Convex JWT store.
 *
 *   import { ConvexProviderWithAuth } from "convex/react";
 *   import { useAuth } from "convex-simple-auth/react";
 *
 *   <ConvexProviderWithAuth client={convex} useAuth={useAuth}>...</...>
 */
import { useCallback, useSyncExternalStore } from "react";
import { subscribe, tokenStore } from "./token-store.js";
export { tokenStore };
export function useAuth() {
    const token = useSyncExternalStore(subscribe, tokenStore.get, () => null);
    const fetchAccessToken = useCallback(async () => token, [token]);
    return {
        isLoading: false,
        isAuthenticated: token !== null,
        fetchAccessToken,
    };
}
//# sourceMappingURL=react.js.map