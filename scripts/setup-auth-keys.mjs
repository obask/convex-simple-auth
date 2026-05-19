#!/usr/bin/env node
/**
 * Generate a fresh ES256 keypair for Convex JWT auth.
 *
 *   1. Generates a P-256 keypair.
 *   2. Uploads the private PEM to the Convex deployment as `JWT_PRIVATE_KEY`.
 *      All extra CLI args are forwarded to `convex env set` (so you can pass
 *      `--prod`, `--preview-name`, `--dev`, etc.).
 *   3. Rewrites the JWKS block in `convex/auth.config.ts` (between the
 *      `JWKS:BEGIN` and `JWKS:END` marker comments) with the matching public
 *      JWK. Public keys are safe to commit.
 *
 * Run from your project root:
 *   pnpm exec convex-simple-auth-keys           # default deployment
 *   pnpm exec convex-simple-auth-keys --prod    # production deployment
 */
import { generateKeyPairSync } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const KEY_ID = "default";
const CONFIG_PATH = resolve(process.cwd(), "convex/auth.config.ts");
const BEGIN = "// JWKS:BEGIN";
const END = "// JWKS:END";

function detectPackageRunner() {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm")) return ["pnpm", ["exec"]];
  if (ua.startsWith("bun")) return ["bun", ["x"]];
  if (ua.startsWith("yarn")) return ["yarn", []];
  return ["npx", []];
}

// 1. Generate keypair.
const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});
const pem = privateKey.export({ format: "pem", type: "pkcs8" });

const publicJwk = publicKey.export({ format: "jwk" });
const jwkEntry = {
  kty: publicJwk.kty,
  crv: publicJwk.crv,
  x: publicJwk.x,
  y: publicJwk.y,
  use: "sig",
  alg: "ES256",
  kid: KEY_ID,
};

// 2. Upload private PEM to Convex deployment env.
const passthrough = process.argv.slice(2);
const dir = mkdtempSync(join(tmpdir(), "convex-simple-auth-"));
const pemFile = join(dir, "private.pem");
writeFileSync(pemFile, pem, { mode: 0o600 });

try {
  const [runner, prefix] = detectPackageRunner();
  const args = [
    ...prefix,
    "convex",
    "env",
    ...passthrough,
    "set",
    "JWT_PRIVATE_KEY",
    "--from-file",
    pemFile,
  ];
  const result = spawnSync(runner, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
} finally {
  try {
    unlinkSync(pemFile);
  } catch {
    // already gone
  }
}

// 3. Rewrite the JWKS block in convex/auth.config.ts.
if (!existsSync(CONFIG_PATH)) {
  console.warn(
    `\n[convex-simple-auth] ${CONFIG_PATH} not found.\n` +
      `Create it from the template in the README, then re-run this script.\n`,
  );
  process.exit(0);
}

const source = readFileSync(CONFIG_PATH, "utf8");
const beginIdx = source.indexOf(BEGIN);
const endIdx = source.indexOf(END);
if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
  console.error(
    `\n[convex-simple-auth] Could not find ${BEGIN} / ${END} markers in ${CONFIG_PATH}.\n` +
      `Copy the auth.config.ts template from the README (it includes the marker comments).\n`,
  );
  process.exit(1);
}

const replacement =
  `${BEGIN} (do not edit; rewritten by convex-simple-auth-keys)\n` +
  `const JWKS = ${JSON.stringify({ keys: [jwkEntry] }, null, 2)};\n` +
  `${END}`;

const next =
  source.slice(0, beginIdx) +
  replacement +
  source.slice(endIdx + END.length);

writeFileSync(CONFIG_PATH, next);
console.log(
  `\n[convex-simple-auth] JWT_PRIVATE_KEY set on Convex deployment.\n` +
    `[convex-simple-auth] Public JWK written to ${CONFIG_PATH} (kid="${KEY_ID}").\n` +
    `[convex-simple-auth] Commit the change; redeploy Convex if needed.`,
);
