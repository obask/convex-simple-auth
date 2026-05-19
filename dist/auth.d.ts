export declare const signUp: import("convex/server").RegisteredAction<"public", {
    email: string;
    password: string;
}, Promise<string>>;
export declare const signIn: import("convex/server").RegisteredAction<"public", {
    email: string;
    password: string;
}, Promise<string>>;
export declare const signInAnonymous: import("convex/server").RegisteredAction<"public", {}, Promise<string>>;
//# sourceMappingURL=auth.d.ts.map