# convex-simple-auth

Minimal JWT-based email/password + anonymous auth for Convex.

- **~170 LoC** across 2 source files. No HTTP routes, no JWKS endpoint.
- **One runtime dep:** `jose`. Password hashing uses Web Crypto (built into Convex).
- **One env var:** `JWT_PRIVATE_KEY`.
- **Static JWK** baked into `convex/auth.config.ts` as a `data:` URI — works on Vercel preview deployments out of the box.
- `ctx.auth.getUserIdentity()` works normally inside queries/mutations.

## Install

```sh
pnpm add github:obask/convex-simple-auth#dist
pnpm add jose
```

`convex`, `jose`, and `react` are peer deps.

## Setup (4 files, all copy-paste from below)

### 1. `convex/schema.ts`

```ts
import { defineSchema } from "convex/server";
import { authTables } from "convex-simple-auth/server";

export default defineSchema({
  ...authTables,
  // your tables here
});
```

### 2. `convex/auth.config.ts`

Paste verbatim. The `JWKS:BEGIN`/`JWKS:END` markers let the keygen script rewrite the public JWK in place.

```ts
/// <reference types="node" />
import type { AuthConfig } from "convex/server";

// JWKS:BEGIN (do not edit; rewritten by convex-simple-auth-keys)
const JWKS = {
  keys: [
    {
      kty: "EC",
      crv: "P-256",
      x: "",
      y: "",
      use: "sig",
      alg: "ES256",
      kid: "default",
    },
  ],
};
// JWKS:END

const jwksDataUri =
  "data:application/json;base64," +
  Buffer.from(JSON.stringify(JWKS)).toString("base64");

export default {
  providers: [
    {
      type: "customJwt",
      issuer: process.env.CONVEX_SITE_URL!,
      jwks: jwksDataUri,
      algorithm: "ES256",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
```

### 3. `convex/users.ts`

```ts
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) =>
    await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique(),
});

export const create = internalMutation({
  args: {
    email: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert("users", args),
});
```

### 4. `convex/auth.ts`

```ts
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
```

### 5. Generate the JWT keypair

```sh
pnpm exec convex-simple-auth-keys
```

This:

1. Generates a fresh P-256 keypair.
2. Sets `JWT_PRIVATE_KEY` on your Convex deployment.
3. Rewrites the `JWKS` block in `convex/auth.config.ts` with the matching public JWK.

Run with `--prod`, `--preview-name <branch>`, etc. to target other Convex deployments. For Vercel preview deployments with a separate Convex preview env per branch, run it once per deployment (or copy the same `JWT_PRIVATE_KEY` to all of them so the single committed public JWK matches everywhere).

Commit the resulting `convex/auth.config.ts`. Public keys are safe to commit.

## Client wiring

### React

```tsx
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { useAuth } from "convex-simple-auth/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

<ConvexProviderWithAuth client={convex} useAuth={useAuth}>
  <App />
</ConvexProviderWithAuth>;
```

### SolidJS

```tsx
import { useAuth } from "convex-simple-auth/solid";

// Feed `useAuth` into whichever Solid Convex client you use; it returns the
// same `{ isLoading, isAuthenticated, fetchAccessToken }` shape Convex auth
// providers expect.
```

### Framework-free

If neither binding fits, import the store directly and write your own hook:

```ts
import { tokenStore, subscribe } from "convex-simple-auth/token-store";
```

`/react`, `/solid`, and `/token-store` are separate subpath exports — each one
is its own file. Importing `/react` never pulls in `solid-js`, and vice versa.


Sign-in / sign-out:

```tsx
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { tokenStore } from "convex-simple-auth/react";

const signIn = useAction(api.auth.signIn);
const signUp = useAction(api.auth.signUp);
const signInAnonymous = useAction(api.auth.signInAnonymous);

await tokenStore.set(await signIn({ email, password }));
// or:
await tokenStore.set(await signInAnonymous());
// log out:
tokenStore.clear();
```

## Reading the current user

Inside any query/mutation:

```ts
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated.");
const userId = identity.subject as Id<"users">;
```

Anonymous JWTs carry `{ anonymous: true }`; email JWTs carry `{ email }`.

## Why so few moving parts

- **No JWKS HTTP route.** The public JWK is baked into `auth.config.ts` as a `data:` URI. Convex's `customJwt` provider supports this directly.
- **No password-hashing dep.** PBKDF2-SHA-256 with 600k iterations is built into Convex's V8 runtime via `crypto.subtle`.
- **No client provider boilerplate.** `useAuth` is a 15-line hook over `useSyncExternalStore`.

## Key rotation

Re-run `pnpm exec convex-simple-auth-keys` (with `--prod` etc. as needed), commit `convex/auth.config.ts`, redeploy. All existing JWTs become invalid — users sign back in.

## Releasing (maintainer)

```sh
pnpm run release
```

Builds `dist/` and force-pushes the `dist` branch with sources + compiled output + scripts + templates.

## License

MIT
