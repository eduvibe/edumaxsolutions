import { createPrivateKey, createPublicKey } from "node:crypto";
import type { PlanId } from "./pricing";
import { isSupportedBravoEditionYear } from "./edition";
import { deriveActivationContentClaims, type ContentRootKeySet } from "./content-key-core";
import type { BravoSignedReleaseKeyContext } from "./release-context";
import {
  BUNDLE,
  normalizeProductId,
  signActivationKey,
  verifyActivationKey,
} from "./vendor/license-core.js";

/**
 * Public verification key from the Bravo app repo (non-secret).
 * The Bravo app verifies activation keys offline against this key.
 * Stored as a TS constant because *.pem files are git-ignored in this repo.
 */
export const BRAVO_ACTIVATION_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEsRcSkjfHeCzBFr35k9jvwckhB3h9qSZfRpdqx8CflpC2xSkIqO5Pj1xdWPlTl2Ps3gDczk7ttnSDwAs85xhf6A==
-----END PUBLIC KEY-----
`;

export type ActivationKeyRequest = {
  productId: string;
  plan: PlanId;
  orderRef: string;
  /** Edition recorded on the order at creation time. */
  editionYear: number;
};

/** Must produce a key in the exact format defined by the Bravo app's shared/license-core.js. */
export type ActivationKeySigner = (request: ActivationKeyRequest) => Promise<string>;

export class ActivationKeyUnavailableError extends Error {}

/**
 * Default signer. It intentionally FAILS CLOSED until v3 issuance is wired to the
 * protected content roots and the signed installed-release key context is verified.
 * See docs/bravo-online-payment.md ("Activation key signer").
 */
export const unvendoredActivationKeySigner: ActivationKeySigner = async () => {
  throw new ActivationKeyUnavailableError(
    "Bravo v3 issuance is unavailable until content roots and the signed-release key context are verified."
  );
};

export type LicenseCoreSignerOptions = {
  privateKeyPem: string;
  contentRootKeySet: ContentRootKeySet;
  /** Must come from the signature-verified installed release, never from env/test fixtures. */
  releaseKeyContext: BravoSignedReleaseKeyContext;
  /** Bravo bundle: JAMB=1, WAEC=2, BOTH=3. Defaults to BOTH until orders carry a bundle. */
  bundle?: number;
  /** Used to self-check every issued key. Defaults to the committed Bravo public key. */
  publicKeyPem?: string;
  now?: () => number;
};

/**
 * Signs keys with the Bravo shared/license-core.js format. Every key is verified against
 * the public key before it is returned, so a wrong private key can never reach a buyer.
 */
export function createLicenseCoreSigner(opts: LicenseCoreSignerOptions): ActivationKeySigner {
  const bundle = opts.bundle ?? BUNDLE.BOTH;
  const publicKeyPem = opts.publicKeyPem ?? BRAVO_ACTIVATION_PUBLIC_KEY_PEM;
  const now = opts.now ?? (() => Math.floor(Date.now() / 1000));

  if (!opts.contentRootKeySet || !opts.releaseKeyContext) {
    throw new ActivationKeyUnavailableError("v3 content roots and verified release context are required");
  }
  if (opts.contentRootKeySet.keyEpoch !== opts.releaseKeyContext.keyEpoch ||
      opts.contentRootKeySet.rootYear !== opts.releaseKeyContext.rootYear) {
    throw new ActivationKeyUnavailableError("content root-key context does not match the verified signed release");
  }

  return async ({ productId, editionYear }) => {
    const pid = normalizeProductId(productId);
    if (!pid) throw new Error("signer received an invalid product id");
    if (!isSupportedBravoEditionYear(editionYear)) {
      throw new Error("signer received an unsupported editionYear (supported bank range: 2015–2026)");
    }
    const claims = deriveActivationContentClaims(opts.contentRootKeySet, { editionYear, bundle });
    if (claims.keyEpoch !== opts.releaseKeyContext.keyEpoch || claims.rootYear !== opts.releaseKeyContext.rootYear) {
      throw new ActivationKeyUnavailableError("derived content-key context does not match the verified signed release");
    }
    const key: string = await signActivationKey({
      privateKeyPem: opts.privateKeyPem,
      productId: pid,
      bundle,
      editionYear,
      ...claims,
      issuedAt: now(),
      expiresAt: 0,
      flags: 1,
      includeScoreClaim: true,
    });
    const check = await verifyActivationKey({ activationKey: key, productId: pid, publicKeyPem, now: now() });
    if (!check.ok || !check.payload || (check.payload as { version?: number }).version !== 3) {
      throw new Error(`self-check of issued v3 key failed: ${check.reason ?? "unexpected version"}`);
    }
    const payload = check.payload as { keyEpoch?: number; rootYear?: number; contentKeys?: Record<string, Uint8Array>; scoreClaim?: string };
    if (payload.keyEpoch !== claims.keyEpoch || payload.rootYear !== claims.rootYear || !payload.scoreClaim) {
      throw new Error("self-check of issued v3 content claims failed");
    }
    for (const exam of Object.keys(claims.contentKeys)) {
      if (!payload.contentKeys?.[exam]) throw new Error("self-check of issued v3 exam key failed");
    }
    return key;
  };
}

/** Ensures the server-only private key corresponds to the committed public key. */
export function assertActivationPrivateKeyMatchesPublicKey(privateKeyPem: string): void {
  const derivedPublic = createPublicKey(createPrivateKey(privateKeyPem))
    .export({ type: "spki", format: "pem" })
    .toString();
  const committedPublic = createPublicKey(BRAVO_ACTIVATION_PUBLIC_KEY_PEM)
    .export({ type: "spki", format: "pem" })
    .toString();
  if (derivedPublic !== committedPublic) {
    throw new Error("BRAVO_ACTIVATION_PRIVATE_KEY does not match the committed Bravo public key");
  }
}
