import { createPrivateKey, createPublicKey } from "node:crypto";
import type { PlanId } from "./pricing";
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
};

/** Must produce a key in the exact format defined by the Bravo app's shared/license-core.js. */
export type ActivationKeySigner = (request: ActivationKeyRequest) => Promise<string>;

export class ActivationKeyUnavailableError extends Error {}

/**
 * Default signer. It intentionally FAILS CLOSED: no key can be issued until the
 * non-secret Bravo `shared/license-core.js` has been vendored and wired in here.
 * See docs/bravo-online-payment.md ("Activation key signer").
 */
export const unvendoredActivationKeySigner: ActivationKeySigner = async () => {
  throw new ActivationKeyUnavailableError(
    "Activation key format (Bravo shared/license-core.js) is not vendored yet; refusing to issue keys."
  );
};

export type LicenseCoreSignerOptions = {
  privateKeyPem: string;
  editionYear: number;
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
  if (!Number.isInteger(opts.editionYear) || opts.editionYear < 2000 || opts.editionYear > 2100) {
    throw new Error("editionYear must be a year between 2000 and 2100");
  }
  const bundle = opts.bundle ?? BUNDLE.BOTH;
  const publicKeyPem = opts.publicKeyPem ?? BRAVO_ACTIVATION_PUBLIC_KEY_PEM;
  const now = opts.now ?? (() => Math.floor(Date.now() / 1000));

  return async ({ productId }) => {
    const pid = normalizeProductId(productId);
    if (!pid) throw new Error("signer received an invalid product id");
    const key: string = await signActivationKey({
      privateKeyPem: opts.privateKeyPem,
      productId: pid,
      bundle,
      editionYear: opts.editionYear,
      issuedAt: now(),
      expiresAt: 0,
      flags: 1,
    });
    const check = await verifyActivationKey({
      activationKey: key,
      productId: pid,
      publicKeyPem,
      now: now(),
    });
    if (!check.ok) {
      throw new Error(`self-check of issued key failed: ${check.reason}`);
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
