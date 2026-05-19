/**
 * Ready-to-mount internal `users` table helpers.
 *
 * Re-export from your app's `convex/users.ts`:
 *
 *   export { getByEmail, create } from "convex-simple-auth/users";
 *
 * `convex-simple-auth/auth` references these via `internal.users.getByEmail`
 * and `internal.users.create`, so the file path must be exactly `users.ts`.
 */
import {
  internalMutationGeneric,
  internalQueryGeneric,
} from "convex/server";
import { v } from "convex/values";

export const getByEmail = internalQueryGeneric({
  args: { email: v.string() },
  handler: async (ctx, { email }) =>
    await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .unique(),
});

export const create = internalMutationGeneric({
  args: {
    email: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.email !== undefined) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .unique();
      if (existing !== null) {
        throw new Error("An account with that email already exists.");
      }
    }
    return await ctx.db.insert("users", args);
  },
});
