// Wires the production dependencies (Turso, Paystack, Resend, signer) for the Bravo routes.
// Server-only. Cached per server instance; configuration is read from environment variables.

import { createClient, type Client } from "@libsql/client";
import { getBravoServerConfig, BravoConfigError } from "./config";
import { createPaystackClient } from "./paystack";
import { createResendMailer } from "./email";
import {
  assertActivationPrivateKeyMatchesPublicKey,
  unvendoredActivationKeySigner,
} from "./activation-key";
import type { BravoDeps } from "./orders";

let cached: BravoDeps | null = null;

export function getBravoDeps(): BravoDeps {
  if (cached) return cached;
  const config = getBravoServerConfig();
  if (config.activationPrivateKeyPem) {
    assertActivationPrivateKeyMatchesPublicKey(config.activationPrivateKeyPem);
  }

  const db: Client = createClient({ url: config.tursoUrl, authToken: config.tursoAuthToken });
  cached = {
    db,
    paystack: createPaystackClient({ secretKey: config.paystackSecretKey }),
    paystackSecretKey: config.paystackSecretKey,
    // TODO(bravo): replace with the signer built from the vendored Bravo shared/license-core.js,
    // using config.activationPrivateKeyPem. Until then, no key can be issued (fail closed).
    signer: unvendoredActivationKeySigner,
    mailer: createResendMailer({ apiKey: config.resendApiKey, from: config.emailFrom }),
    siteUrl: config.siteUrl,
  };
  return cached;
}

export { BravoConfigError };
