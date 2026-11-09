/**
 * Content-key context supplied for the signature-verified installed Bravo release.
 * Keep this pinned in source; environment variables and root-key documents cannot override it.
 */
export type BravoSignedReleaseKeyContext = Readonly<{ keyEpoch: number; rootYear: number }>;

export const BRAVO_SIGNED_RELEASE_KEY_CONTEXT: BravoSignedReleaseKeyContext = Object.freeze({
  keyEpoch: 1,
  rootYear: 2035,
});
