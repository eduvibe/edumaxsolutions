// Types for the vendored Bravo shared/license-core.js at
// eduvibe/bravo commit 69cdfdf3948dfcfb30d67b4d0c64ec0a663ecd73.
export declare const BUNDLE: Readonly<{ JAMB: 1; WAEC: 2; BOTH: 3 }>;
export declare const BUNDLE_NAME: Readonly<Record<number, string>>;
export declare const KEY_VERSION: 1;
export declare const CONTENT_KEY_LICENSE_VERSION: 2;
export declare const CONTENT_KEY_LICENSE_VERSION_V3: 3;
export declare const SCORE_CLAIM_VERSION: 1;
export declare const CONTENT_KEY_BYTES: 32;
export declare const PRODUCT_ID_PREFIX: "BCBT";
export declare const KEY_PREFIX: "BCBTK1";
export declare const KEY_PREFIX_V2: "BCBTK2";
export declare const KEY_PREFIX_V3: "BCBTK3";
export declare const SCORE_CLAIM_PREFIX: "BCBTSC1";
export declare function normalizeProductId(input: string): string | null;
export declare function signActivationKey(args: {
  privateKeyPem: string;
  productId: string;
  bundle: number;
  editionYear: number;
  expiresAt?: number;
  flags?: number;
  issuedAt?: number;
  contentKeys?: Record<string, Uint8Array | ArrayBuffer | string> | null;
  keyEpoch?: number | null;
  rootYear?: number | null;
  includeScoreClaim?: boolean;
}): Promise<string>;
export declare function verifyActivationKey(args: {
  activationKey: string;
  productId: string;
  publicKeyPem: string;
  now?: number;
}): Promise<{ ok: boolean; reason?: string; payload?: unknown }>;
export declare function verifyScoreClaim(args: {
  scoreClaim: string;
  productId: string;
  publicKeyPem: string;
  now?: number;
}): Promise<{ ok: boolean; reason?: string; payload?: unknown }>;
export declare function payloadToLicense(payload: unknown): Record<string, unknown>;
