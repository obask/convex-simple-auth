/**
 * SolidJS binding for the Convex JWT store.
 *
 * Returns the same `{ isLoading, isAuthenticated, fetchAccessToken }` shape
 * Convex auth providers expect. Pair with whichever Solid Convex client you
 * use.
 *
 *   import { useAuth } from "convex-simple-auth/solid";
 */
import { createSignal, onCleanup } from "solid-js";
import { subscribe, tokenStore } from "./token-store.js";
export { tokenStore };
export function useAuth() {
    const [token, setToken] = createSignal(tokenStore.get());
    const unsub = subscribe(() => setToken(tokenStore.get()));
    onCleanup(unsub);
    const fetchAccessToken = async () => token();
    return {
        isLoading: false,
        get isAuthenticated() {
            return token() !== null;
        },
        fetchAccessToken,
    };
}
//# sourceMappingURL=solid.js.map