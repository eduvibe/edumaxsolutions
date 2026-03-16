import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPlatformPublicEnv, getPlatformServerEnv } from "@/lib/platform/env";

let cached: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (cached) return cached;
  const pub = getPlatformPublicEnv();
  const srv = getPlatformServerEnv();
  if (!pub.supabase.url || !pub.supabase.anonKey) {
    throw new Error("Supabase is not configured");
  }
  const key = srv.supabase?.serviceRoleKey ?? pub.supabase.anonKey;
  cached = createClient(pub.supabase.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function getSupabaseServerClientWithAccessToken(accessToken: string): SupabaseClient {
  const pub = getPlatformPublicEnv();
  if (!pub.supabase.url || !pub.supabase.anonKey) {
    throw new Error("Supabase is not configured");
  }
  return createClient(pub.supabase.url, pub.supabase.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
