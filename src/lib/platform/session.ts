import { cookies } from "next/headers";

export type PlatformRole = "student" | "teacher";

const ROLE_COOKIE = "edumax_role";

export async function getPlatformRole(): Promise<PlatformRole> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ROLE_COOKIE)?.value;
  if (value === "teacher") return "teacher";
  return "student";
}

export const platformRoleCookieName = ROLE_COOKIE;
