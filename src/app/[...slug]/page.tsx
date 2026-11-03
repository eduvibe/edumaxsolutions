// Staff-only Bravo console. The URL is deliberately non-obvious and environment-configurable:
// set BRAVO_CONSOLE_PATH (default /learning/centre/7f2k9). The path is NOT a security control —
// the console has its own Bravo staff sign-in (per-staff tokens stored as hashes in Turso),
// and every staff API route re-checks it server-side. Independent of the Edumax learning
// platform's Supabase login. Not linked from any navigation or sitemap.
import { notFound } from "next/navigation";
import { BravoConsoleClient } from "@/components/bravo/BravoConsoleClient";
import { getConsolePath } from "@/lib/bravo/consolePath";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Learning Centre",
  robots: { index: false, follow: false },
};

export default async function ConsolePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const requested = "/" + (slug ?? []).join("/");
  if (requested !== getConsolePath()) notFound();
  return <BravoConsoleClient />;
}
