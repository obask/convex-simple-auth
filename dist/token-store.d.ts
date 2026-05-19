export declare const tokenStore: {
    get: () => string | null;
    set: (token: string) => void;
    clear: () => void;
};
/** Subscribe to store changes. Returns an unsubscribe function. */
export declare function subscribe(listener: () => void): () => void;
//# sourceMappingURL=token-store.d.ts.map