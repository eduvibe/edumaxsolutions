import { createHash, randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  deriveActivationContentClaims,
  deriveYearKeySync,
  loadContentRootKeySetFromEnv,
  parseContentRootKeySet,
} from "../../src/lib/bravo/content-key-core";

const tempRoots: string[] = [];
function tempDir(prefix: string) {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
}
afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function rootDocument(keyEpoch = 19, rootYear = 2026) {
  return {
    schemaVersion: 1,
    keyEpoch,
    rootYear,
    roots: { jamb: randomBytes(32).toString("base64url"), waec: randomBytes(32).toString("base64url") },
  };
}

describe("Bravo content-root key contract", () => {
  it("derives the documented SHA-256 year chain and bundle-scoped claims", () => {
    const document = rootDocument();
    const set = parseContentRootKeySet(document);
    const rootJamb = Buffer.from(document.roots.jamb, "base64url");
    const expectedJamb = createHash("sha256").update(createHash("sha256").update(rootJamb).digest()).digest();
    expect(deriveYearKeySync(rootJamb, 2026, 2024)).toEqual(expectedJamb);

    const jambOnly = deriveActivationContentClaims(set, { editionYear: 2024, bundle: 1 });
    expect(jambOnly).toMatchObject({ keyEpoch: 19, rootYear: 2026 });
    expect(Object.keys(jambOnly.contentKeys)).toEqual(["jamb"]);
    expect(jambOnly.contentKeys.jamb).toEqual(expectedJamb);

    const waecOnly = deriveActivationContentClaims(set, { editionYear: 2024, bundle: 2 });
    expect(Object.keys(waecOnly.contentKeys)).toEqual(["waec"]);
    const both = deriveActivationContentClaims(set, { editionYear: 2024, bundle: 3 });
    expect(Object.keys(both.contentKeys)).toEqual(["jamb", "waec"]);
  });

  it("rejects malformed roots, unknown schemas, invalid bundles, and later editions", () => {
    const document = rootDocument();
    expect(() => parseContentRootKeySet({ ...document, schemaVersion: 2 })).toThrow(/schema version/);
    expect(() => parseContentRootKeySet({ ...document, roots: { ...document.roots, jamb: "not-a-key" } })).toThrow(/base64url/);
    expect(() => deriveActivationContentClaims(parseContentRootKeySet(document), { editionYear: 2027, bundle: 3 })).toThrow(/later than/);
    expect(() => deriveActivationContentClaims(parseContentRootKeySet(document), { editionYear: 2026, bundle: 4 })).toThrow(/bundle/);
  });

  it("prefers JSON env over the file path and loads protected JSON outside the repository", () => {
    const repo = tempDir("bravo-repo-");
    const secrets = tempDir("bravo-secret-");
    const fileDoc = rootDocument(10, 2026);
    const envDoc = rootDocument(11, 2026);
    const filePath = path.join(secrets, "content-roots.json");
    writeFileSync(filePath, JSON.stringify(fileDoc), { mode: 0o600 });

    expect(loadContentRootKeySetFromEnv({
      env: { BRAVO_CONTENT_ROOT_KEYS_FILE: filePath }, repositoryRoot: repo,
    })?.keyEpoch).toBe(10);
    expect(loadContentRootKeySetFromEnv({
      env: { BRAVO_CONTENT_ROOT_KEYS_FILE: filePath, BRAVO_CONTENT_ROOT_KEYS_JSON: JSON.stringify(envDoc) },
      repositoryRoot: repo,
    })?.keyEpoch).toBe(11);
  });

  it("rejects a file stored in the repository, including a symlink to it", () => {
    const repo = tempDir("bravo-repo-");
    const secretDoc = tempDir("bravo-secret-");
    const inside = path.join(repo, "keys.json");
    writeFileSync(inside, JSON.stringify(rootDocument()));
    expect(() => loadContentRootKeySetFromEnv({
      env: { BRAVO_CONTENT_ROOT_KEYS_FILE: inside }, repositoryRoot: repo,
    })).toThrow(/outside the repository/);

    const link = path.join(secretDoc, "alias.json");
    symlinkSync(inside, link);
    expect(() => loadContentRootKeySetFromEnv({
      env: { BRAVO_CONTENT_ROOT_KEYS_FILE: link }, repositoryRoot: repo,
    })).toThrow(/outside the repository/);
  });

  it("returns null when no content-root secret is configured", () => {
    expect(loadContentRootKeySetFromEnv({ env: {}, repositoryRoot: process.cwd() })).toBeNull();
  });
});
