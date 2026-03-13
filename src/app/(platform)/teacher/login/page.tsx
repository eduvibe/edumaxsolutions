import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import Link from "next/link";

export const metadata = {
  title: "Teacher Login",
};

export default function TeacherLoginPage() {
  const env = getPlatformPublicEnv();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Teacher Login</h1>
        <p className="text-muted-foreground">
          Sign in to create notes, questions, and templates.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Email login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <div className="text-sm font-medium">Email</div>
            <Input placeholder="teacher@example.com" type="email" disabled={!env.supabaseConfigured} />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">Password</div>
            <Input placeholder="••••••••" type="password" disabled={!env.supabaseConfigured} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button disabled={!env.supabaseConfigured}>Sign in</Button>
            <Button disabled={!env.supabaseConfigured} variant="outline">
              Continue with Google
            </Button>
            <Button asChild variant="secondary">
              <Link href="/teacher/dashboard">Continue in demo mode</Link>
            </Button>
          </div>

          {!env.supabaseConfigured ? (
            <div className="text-sm text-muted-foreground">
              Supabase is not configured yet. Demo mode is enabled until you add
              environment variables.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

