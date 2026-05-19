export declare const getByEmail: import("convex/server").RegisteredQuery<"internal", {
    email: string;
}, Promise<any>>;
export declare const create: import("convex/server").RegisteredMutation<"internal", {
    email?: string | undefined;
    passwordHash?: string | undefined;
}, Promise<import("convex/values").GenericId<"users">>>;
//# sourceMappingURL=users.d.ts.map