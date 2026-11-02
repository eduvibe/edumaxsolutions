// Staff-only Bravo console. The URL is deliberately non-obvious and environment-configurable:
// set BRAVO_CONSOLE_PATH (default /learning/centre/7f2k9). The path is NOT a security control —
// the client component enforces the Supabase session + admin role, and every staff API route
// re-checks them server-side via requireAdmin. Not linked from any navigation or sitemap.
import { notFound } from "next/navigation";
import { BravoConsoleClient } from "@/components/bravo/BravoConsoleClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Learning Centre",
  robots: { index: false, follow: false },
};

const DEFAULT_CONSOLE_PATH = "/learning/centre/7f2k9";

export function getConsolePath(): string {
  const raw = process.env.BRAVO_CONSOLE_PATH?.trim();
  const path = raw && raw.startsWith("/") ? raw : DEFAULT_CONSOLE_PATH;
  return path.replace(/\/+$/, "") || DEFAULT_CONSOLE_PATH;
}

export default async function ConsolePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const requested = "/" + (slug ?? []).join("/");
  if (requested !== getConsolePath()) notFound();
  return <BravoConsoleClient />;
}
