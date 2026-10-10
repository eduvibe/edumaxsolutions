import { createPrivateKey, createPublicKey } from "node:crypto";
import type { PlanId } from "./pricing";

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
