// Wires the production dependencies (Turso, Paystack, Resend, signer) for the Bravo routes.
// Server-only. Cached per server instance; configuration is read from environment variables.

import { createClient, type Client } from "@libsql/client";
import { getBravoServerConfig, BravoConfigError } from "./config";
import { createPaystackClient } from "./paystack";
import { createResendMailer } from "./email";
import {
  assertActivationPrivateKeyMatchesPublicKey,
  createLicenseCoreSigner,
  unvendoredActivationKeySigner,
  type ActivationKeySigner,
} from "./activation-key";
import type { BravoDeps } from "./orders";
import { BRAVO_SIGNED_RELEASE_KEY_CONTEXT } from "./release-context";

let cached: BravoDeps | null = null;

export function getBravoDeps(): BravoDeps {
  if (cached) return cached;
  const config = getBravoServerConfig();
  if (config.activationPrivateKeyPem) {
    assertActivationPrivateKeyMatchesPublicKey(config.activationPrivateKeyPem);
  }

  // Production issuance fails closed until the installed signed-release key context is verified.
  // No env-provided epoch/year can override this source-controlled release metadata.
  let signer: ActivationKeySigner = unvendoredActivationKeySigner;
  if (config.activationPrivateKeyPem && config.contentRootKeySet && BRAVO_SIGNED_RELEASE_KEY_CONTEXT) {
    signer = createLicenseCoreSigner({
      privateKeyPem: config.activationPrivateKeyPem,
      contentRootKeySet: config.contentRootKeySet,
      releaseKeyContext: BRAVO_SIGNED_RELEASE_KEY_CONTEXT,
    });
  }

  const db: Client = createClient({ url: config.tursoUrl, authToken: config.tursoAuthToken });
  cached = {
    db,
    paystack: createPaystackClient({ secretKey: config.paystackSecretKey }),
    paystackSecretKey: config.paystackSecretKey,
    signer,
    editionYear: config.editionYear,
    mailer: createResendMailer({ apiKey: config.resendApiKey, from: config.emailFrom }),
    siteUrl: config.siteUrl,
  };
  return cached;
}

export { BravoConfigError };
