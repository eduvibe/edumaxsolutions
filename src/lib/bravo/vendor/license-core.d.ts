// Types for the vendored Bravo app file shared/license-core.js (copied verbatim from
// eduvibe/bravo main at commit 7feb3ca). Keep in sync if the Bravo repo changes it.
export declare const BUNDLE: Readonly<{ JAMB: 1; WAEC: 2; BOTH: 3 }>;
export declare const BUNDLE_NAME: Readonly<Record<number, string>>;
export declare const KEY_VERSION: 1;
export declare const PRODUCT_ID_PREFIX: "BCBT";
export declare const KEY_PREFIX: "BCBTK1";
export declare function normalizeProductId(input: string): string | null;
export declare function signActivationKey(args: {
  privateKeyPem: string;
  productId: string;
  bundle: number;
  editionYear: number;
  expiresAt?: number;
  flags?: number;
  issuedAt?: number;
}): Promise<string>;
export declare function verifyActivationKey(args: {
  activationKey: string;
  productId: string;
  publicKeyPem: string;
  now?: number;
}): Promise<{ ok: boolean; reason?: string; payload?: unknown }>;
