import { TutorSignInButton } from "@/components/platform/TutorSignInButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPlatformPublicEnv } from "@/lib/platform/env";

export const metadata = {
  title: "Tutor Login",
};

export default function TutorLoginPage() {
  const env = getPlatformPublicEnv();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Tutor login</h1>
        <p className="text-sm text-black/70 dark:text-white/70">Students can browse resources without signing in.</p>
      </header>

      <div className="rounded-3xl border border-black/10 bg-transparent p-6 dark:border-white/10 md:p-8">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-medium">Email</div>
            <Input placeholder="tutor@example.com" type="email" disabled={!env.supabaseConfigured} />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">Password</div>
            <Input placeholder="••••••••" type="password" disabled={!env.supabaseConfigured} />
          </div>

          <div className="flex flex-wrap gap-2">
            <TutorSignInButton className="rounded-full" />
            <Button disabled={!env.supabaseConfigured} variant="secondary" className="rounded-full bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
              Continue with Google
            </Button>
          </div>

          {!env.supabaseConfigured ? (
            <div className="text-sm text-black/70 dark:text-white/70">
              Supabase is not configured yet. Auth buttons are disabled.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
