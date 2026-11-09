// Bravo content-root derivation, ported from shared/content-key-core.mjs at
// eduvibe/bravo commit 69cdfdf3948dfcfb30d67b4d0c64ec0a663ecd73.
// Keep this server-only: root keys must never reach a browser or logs.
import { createHash, hkdfSync } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";

export const CONTENT_ROOT_KEYS_SCHEMA_VERSION = 1;
export const CONTENT_KEY_BYTES = 32;
export const CONTENT_EXAMS = ["jamb", "waec"] as const;
export type ContentExam = (typeof CONTENT_EXAMS)[number];

export type ContentRootKeySet = {
  schemaVersion: 1;
  keyEpoch: number;
  rootYear: number;
  roots: Record<ContentExam, Buffer>;
};

export type ActivationContentClaims = {
  keyEpoch: number;
  rootYear: number;
  contentKeys: Partial<Record<ContentExam, Buffer>>;
};

function validYear(value: unknown, label: string): number {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new Error(`${label} must be a four-digit year.`);
  }
  return year;
}

function decodeKey(value: unknown, label: string): Buffer {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value)) {
    throw new Error(`${label} must be a 32-byte base64url key.`);
  }
  const key = Buffer.from(value, "base64url");
  if (key.length !== CONTENT_KEY_BYTES || key.toString("base64url") !== value) {
    throw new Error(`${label} must be a canonical 32-byte base64url key.`);
  }
  return key;
}

/** Parse and validate the protected operator-only root-key document. */
export function parseContentRootKeySet(input: unknown): ContentRootKeySet {
  let document: unknown = input;
  if (typeof input === "string") {
    try {
      document = JSON.parse(input);
    } catch {
      throw new Error("Content root-key document is not valid JSON.");
    }
  }
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("Content root-key document must be an object.");
  }
  const value = document as Record<string, unknown>;
  if (value.schemaVersion !== CONTENT_ROOT_KEYS_SCHEMA_VERSION) {
    throw new Error(`Unsupported content root-key schema version: ${String(value.schemaVersion)}`);
  }
  const keyEpoch = Number(value.keyEpoch);
  if (!Number.isSafeInteger(keyEpoch) || keyEpoch < 1 || keyEpoch > 0xffffffff) {
    throw new Error("Content keyEpoch must be a positive 32-bit integer.");
  }
  const rootYear = validYear(value.rootYear, "Content rootYear");
  if (!value.roots || typeof value.roots !== "object" || Array.isArray(value.roots)) {
    throw new Error("Content root keys are missing.");
  }
  const rootsValue = value.roots as Record<string, unknown>;
  const roots = {
    jamb: decodeKey(rootsValue.jamb, "roots.jamb"),
    waec: decodeKey(rootsValue.waec, "roots.waec"),
  };
  return { schemaVersion: CONTENT_ROOT_KEYS_SCHEMA_VERSION, keyEpoch, rootYear, roots };
}

function isWithin(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

/**
 * BRAVO_CONTENT_ROOT_KEYS_JSON takes precedence over BRAVO_CONTENT_ROOT_KEYS_FILE.
 * A configured file must resolve outside the repository, including through symlinks.
 */
export function loadContentRootKeySetFromEnv({
  env = process.env,
  repositoryRoot,
}: {
  env?: Record<string, string | undefined>;
  repositoryRoot?: string;
} = {}): ContentRootKeySet | null {
  if (env.BRAVO_CONTENT_ROOT_KEYS_JSON) return parseContentRootKeySet(env.BRAVO_CONTENT_ROOT_KEYS_JSON);
  const configuredPath = String(env.BRAVO_CONTENT_ROOT_KEYS_FILE || "").trim();
  if (!configuredPath) return null;
  if (!repositoryRoot) throw new Error("repositoryRoot is required when loading a content root-key file.");

  let file: string;
  let repo: string;
  try {
    file = realpathSync(path.resolve(configuredPath));
    repo = realpathSync(repositoryRoot);
  } catch {
    throw new Error("Content root-key file or repository path does not exist.");
  }
  if (isWithin(repo, file)) throw new Error("Content root-key files must be stored outside the repository.");
  return parseContentRootKeySet(readFileSync(file, "utf8"));
}

/** K(y) = SHA-256(K(y+1)); earlier keys cannot derive later editions. */
export function deriveYearKeySync(startKey: Uint8Array, startYear: number, targetYear: number): Buffer {
  let key = Buffer.from(startKey);
  const from = validYear(startYear, "startYear");
  const target = validYear(targetYear, "targetYear");
  if (key.length !== CONTENT_KEY_BYTES) throw new Error("Year-chain key must be 32 bytes.");
  if (target > from) throw new Error("Cannot derive a later year from an earlier edition key.");
  if (from - target > 512) throw new Error("Year-chain derivation exceeds the supported range.");
  for (let year = from; year > target; year--) key = createHash("sha256").update(key).digest();
  return key;
}

export function examKeysForBundle(bundle: number): ContentExam[] {
  const value = Number(bundle);
  if (![1, 2, 3].includes(value)) throw new Error("Unknown exam bundle.");
  const exams: ContentExam[] = [];
  if (value & 1) exams.push("jamb");
  if (value & 2) exams.push("waec");
  return exams;
}

/** Derive only the included exam keys for this activation's edition and bundle. */
export function deriveActivationContentClaims(
  rootKeySet: ContentRootKeySet | unknown,
  { editionYear, bundle }: { editionYear: number; bundle: number },
): ActivationContentClaims {
  const set = rootKeySet && typeof rootKeySet === "object" && "roots" in rootKeySet
    ? rootKeySet as ContentRootKeySet
    : parseContentRootKeySet(rootKeySet);
  const edition = validYear(editionYear, "editionYear");
  if (edition > set.rootYear) throw new Error("License edition is later than the configured content root year.");
  const contentKeys: Partial<Record<ContentExam, Buffer>> = {};
  for (const exam of examKeysForBundle(bundle)) {
    contentKeys[exam] = deriveYearKeySync(set.roots[exam], set.rootYear, edition);
  }
  return { keyEpoch: set.keyEpoch, rootYear: set.rootYear, contentKeys };
}

export function deriveQuestionYearKey(rootKeySet: ContentRootKeySet | unknown, exam: ContentExam, questionYear: number): Buffer {
  const set = rootKeySet && typeof rootKeySet === "object" && "roots" in rootKeySet
    ? rootKeySet as ContentRootKeySet
    : parseContentRootKeySet(rootKeySet);
  if (!CONTENT_EXAMS.includes(exam)) throw new Error(`Unknown exam: ${String(exam)}`);
  const year = validYear(questionYear, "questionYear");
  if (year > set.rootYear) throw new Error("Question year is later than the configured content root year.");
  return deriveYearKeySync(set.roots[exam], set.rootYear, year);
}

export function deriveTrialYearKey(rootKeySet: ContentRootKeySet, exam: ContentExam, questionYear = 2015): Buffer {
  const year = validYear(questionYear, "trial questionYear");
  const yearKey = deriveQuestionYearKey(rootKeySet, exam, year);
  return Buffer.from(hkdfSync(
    "sha256",
    yearKey,
    Buffer.from("bravo-cbt/free-preview-key/v1", "utf8"),
    Buffer.from(`${exam}/${year}`, "utf8"),
    CONTENT_KEY_BYTES,
  ));
}
