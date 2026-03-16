"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPlatformPublicEnv } from "@/lib/platform/env";

let cached: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (cached) return cached;
  const env = getPlatformPublicEnv();
  if (!env.supabase.url || !env.supabase.anonKey) {
    throw new Error("Supabase is not configured");
  }
  cached = createClient(env.supabase.url, env.supabase.anonKey);
  return cached;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

