import { LearnShell } from "@/components/platform/LearnShell";
import { getPlatformRole } from "@/lib/platform/session";

export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const role = await getPlatformRole();
  return <LearnShell initialRole={role}>{children}</LearnShell>;
}

