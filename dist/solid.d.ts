import { tokenStore } from "./token-store.js";
export { tokenStore };
export declare function useAuth(): {
    isLoading: boolean;
    readonly isAuthenticated: boolean;
    fetchAccessToken: () => Promise<string | null>;
};
//# sourceMappingURL=solid.d.ts.map