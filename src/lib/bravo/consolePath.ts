// The Bravo console URL path. Non-obvious and environment-configurable via
// BRAVO_CONSOLE_PATH (default /learning/centre/7f2k9). The path is NOT a security
// control; staff access is enforced by per-staff tokens server-side.
const DEFAULT_CONSOLE_PATH = "/learning/centre/7f2k9";

export function getConsolePath(env: Record<string, string | undefined> = process.env): string {
  const raw = env.BRAVO_CONSOLE_PATH?.trim();
  const path = raw && raw.startsWith("/") ? raw : DEFAULT_CONSOLE_PATH;
  return path.replace(/\/+$/, "") || DEFAULT_CONSOLE_PATH;
}
