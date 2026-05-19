import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  hashPassword,
  normalizeEmail,
  signJwt,
  verifyPassword,
} from "convex-simple-auth/server";

export const signUp = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }): Promise<string> => {
    const e = normalizeEmail(email);
    if (!e || password.length < 8) {
      throw new Error("Email required, password must be at least 8 characters.");
    }
    const existing = await ctx.runQuery(internal.users.getByEmail, { email: e });
    if (existing !== null) {
      throw new Error("An account with that email already exists.");
    }
    const id = await ctx.runMutation(internal.users.create, {
      email: e,
      passwordHash: await hashPassword(password),
    });
    return signJwt(id, { claims: { email: e } });
  },
});

export const signIn = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }): Promise<string> => {
    const e = normalizeEmail(email);
    const user = await ctx.runQuery(internal.users.getByEmail, { email: e });
    if (
      !user ||
      !user.passwordHash ||
      !(await verifyPassword(password, user.passwordHash))
    ) {
      throw new Error("Invalid email or password.");
    }
    return signJwt(user._id, { claims: { email: e } });
  },
});

export const signInAnonymous = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const id = await ctx.runMutation(internal.users.create, {});
    return signJwt(id, { claims: { anonymous: true } });
  },
});
