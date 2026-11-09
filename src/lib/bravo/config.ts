// Server-only configuration. Never import this from a client component.
// Secrets are read from process.env at call time and are never logged or returned to the browser.

import { BRAVO_BANK_FIRST_YEAR, BRAVO_BANK_LAST_YEAR } from "./edition";
import { loadContentRootKeySetFromEnv, type ContentRootKeySet } from "./content-key-core";

export class BravoConfigError extends Error {}

export type BravoServerConfig = {
  paystackSecretKey: string;
  paystackMode: "test" | "live";
  tursoUrl: string;
  tursoAuthToken: string | undefined;
  resendApiKey: string;
  emailFrom: string;
  /** Undefined when not configured: keys then fail closed, but checkout and payment still work. */
  activationPrivateKeyPem: string | undefined;
  /** From BRAVO_EDITION_YEAR. Undefined means keys fail closed until it is set. */
  editionYear: number | undefined;
  /** Protected server-only content roots. Null means the secret is not configured. */
  contentRootKeySet: ContentRootKeySet | null;
  siteUrl: string;
};

const DEFAULT_SITE_URL = "https://www.edumaxsolutions.com.ng";

export function getBravoServerConfig(env: Record<string, string | undefined> = process.env): BravoServerConfig {
  const required = (name: string) => {
    const value = env[name]?.trim();
    if (!value) throw new BravoConfigError(`${name} is not configured`);
    return value;
  };

  const paystackSecretKey = required("PAYSTACK_SECRET_KEY");
  const isTestKey = paystackSecretKey.startsWith("sk_test_");
  const isLiveKey = paystackSecretKey.startsWith("sk_live_");
  if (!isTestKey && !isLiveKey) {
    throw new BravoConfigError("PAYSTACK_SECRET_KEY must be an sk_test_ or sk_live_ key");
  }

  // Guard rails: Preview must never move real money; Production must never use test keys.
  if (env.VERCEL_ENV === "production" && isTestKey) {
    throw new BravoConfigError("Production requires a live Paystack key (sk_live_)");
  }
  if (env.VERCEL_ENV === "preview" && isLiveKey) {
    throw new BravoConfigError("Preview deployments must use a Paystack test key (sk_test_)");
  }

  // Allow the PEM to be stored in a single-line env var using literal \n sequences.
  const rawPem = env.BRAVO_ACTIVATION_PRIVATE_KEY?.trim() || undefined;
  const activationPrivateKeyPem = rawPem && rawPem.includes("\\n") ? rawPem.replace(/\\n/g, "\n") : rawPem;

  const editionRaw = env.BRAVO_EDITION_YEAR?.trim();
  let editionYear: number | undefined;
  if (editionRaw) {
    editionYear = Number(editionRaw);
    if (!/^\d{4}$/.test(editionRaw) || editionYear < BRAVO_BANK_FIRST_YEAR || editionYear > BRAVO_BANK_LAST_YEAR) {
      throw new BravoConfigError(`BRAVO_EDITION_YEAR must be a supported bank year (${BRAVO_BANK_FIRST_YEAR}–${BRAVO_BANK_LAST_YEAR})`);
    }
  }

  let contentRootKeySet: ContentRootKeySet | null;
  try {
    contentRootKeySet = loadContentRootKeySetFromEnv({ env, repositoryRoot: process.cwd() });
  } catch {
    // Deliberately omit parser/path details so neither document contents nor secret paths leak.
    throw new BravoConfigError("BRAVO_CONTENT_ROOT_KEYS_FILE or BRAVO_CONTENT_ROOT_KEYS_JSON is invalid or inaccessible");
  }

  return {
    paystackSecretKey,
    paystackMode: isLiveKey ? "live" : "test",
    tursoUrl: required("TURSO_DATABASE_URL"),
    tursoAuthToken: env.TURSO_AUTH_TOKEN?.trim() || undefined,
    resendApiKey: required("RESEND_API_KEY"),
    emailFrom: required("EMAIL_FROM"),
    activationPrivateKeyPem,
    editionYear,
    contentRootKeySet,
    siteUrl: (env.BRAVO_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, ""),
  };
}
