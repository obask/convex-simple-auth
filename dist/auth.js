/**
 * Ready-to-mount `signUp` / `signIn` / `signInAnonymous` actions.
 *
 * Re-export from your app's `convex/auth.ts`:
 *
 *   export { signIn, signUp, signInAnonymous } from "convex-simple-auth/auth";
 *
 * Requires `convex/users.ts` to re-export from `convex-simple-auth/users` so
 * that `internal.users.getByEmail` and `internal.users.create` resolve.
 */
import { actionGeneric, anyApi } from "convex/server";
import { v } from "convex/values";
import { hashPassword, normalizeEmail, signJwt, verifyPassword, } from "./server.js";
export const signUp = actionGeneric({
    args: { email: v.string(), password: v.string() },
    handler: async (ctx, { email, password }) => {
        const e = normalizeEmail(email);
        if (!e || password.length < 8) {
            throw new Error("Email is required and password must be at least 8 characters.");
        }
        const existing = await ctx.runQuery(anyApi.users.getByEmail, { email: e });
        if (existing !== null) {
            throw new Error("An account with that email already exists.");
        }
        const id = await ctx.runMutation(anyApi.users.create, {
            email: e,
            passwordHash: await hashPassword(password),
        });
        return signJwt(id, { claims: { email: e } });
    },
});
export const signIn = actionGeneric({
    args: { email: v.string(), password: v.string() },
    handler: async (ctx, { email, password }) => {
        const e = normalizeEmail(email);
        const user = await ctx.runQuery(anyApi.users.getByEmail, { email: e });
        if (!user ||
            !user.passwordHash ||
            !(await verifyPassword(password, user.passwordHash))) {
            throw new Error("Invalid email or password.");
        }
        return signJwt(user._id, { claims: { email: e } });
    },
});
export const signInAnonymous = actionGeneric({
    args: {},
    handler: async (ctx) => {
        const id = await ctx.runMutation(anyApi.users.create, {});
        return signJwt(id, { claims: { anonymous: true } });
    },
});
//# sourceMappingURL=auth.js.map