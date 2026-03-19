"use client";

import { Logo } from "@/components/Logo";
import { RoleToggle } from "@/components/platform/RoleToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlatformRole } from "@/lib/platform/session";
import { cn } from "@/lib/utils";
import { Moon, Search, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type LearnTheme = "light" | "dark";

const THEME_STORAGE_KEY = "learn_theme";

function getInitialTheme(): LearnTheme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function LearnShell({
  initialRole,
  children,
}: {
  initialRole: PlatformRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";

  const [theme, setTheme] = useState<LearnTheme>("light");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<PlatformRole>(initialRole);

  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  useEffect(() => {
    setQuery(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    setRole(initialRole);
  }, [initialRole]);

  function toggleTheme() {
    const next: LearnTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  function submitSearch() {
    const q = query.trim();
    if (!q) {
      router.push("/learn/subjects?section=primary");
      return;
    }
    router.push(`/learn?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className={cn(theme === "dark" ? "dark" : "")}>
      <div className="min-h-screen bg-[#f6f2ed] text-[#0f172a] dark:bg-[#0b0f14] dark:text-zinc-100">
        <header className="sticky top-0 z-40 bg-[#f6f2ed]/85 backdrop-blur dark:bg-[#0b0f14]/85">
          <div className="border-b border-black/10 dark:border-white/10">
            <div className="mx-auto max-w-6xl px-4">
              <div className="flex h-16 items-center gap-4">
                <Link href="/learn/subjects?section=primary" className="flex items-center gap-3">
                  <Logo />
                </Link>

                <nav className="hidden items-center gap-5 text-sm font-medium text-black/80 dark:text-white/80 md:flex">
                  <Link href="/learn/subjects?section=primary" className="hover:underline underline-offset-4">
                    Subjects
                  </Link>
                  {role === "teacher" ? (
                    <>
                      <Link href="/learn/teacher/dashboard" className="hover:underline underline-offset-4">
                        Dashboard
                      </Link>
                      <Link href="/learn/templates" className="hover:underline underline-offset-4">
                        Templates
                      </Link>
                    </>
                  ) : (
                    <Link href="/learn/account" className="hover:underline underline-offset-4">
                      Account
                    </Link>
                  )}
                  <Link href="/" className="hover:underline underline-offset-4">
                    About us
                  </Link>
                </nav>

                <div className="ml-auto flex items-center gap-3">
                  <div className="hidden md:block">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40 dark:text-white/40" />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitSearch();
                        }}
                        placeholder="Search"
                        className="h-10 w-[280px] rounded-full border-black/10 bg-white/65 pl-11 pr-4 shadow-sm placeholder:text-black/40 focus-visible:ring-0 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-white/35"
                      />
                    </div>
                  </div>

                  {role === "student" ? (
                    <Button
                      asChild
                      variant="secondary"
                      className="rounded-full border-2 border-black bg-transparent px-4 text-black hover:bg-black/5 dark:border-white dark:text-white dark:hover:bg-white/10"
                    >
                      <Link href="/learn/account">Account</Link>
                    </Button>
                  ) : null}

                  <RoleToggle role={role} onRoleChange={setRole} />

                  <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main>{children}</main>

        {pathname === "/learn" ? (
          <div className="border-t border-black/10 dark:border-white/10 bg-[#b9c8ff] dark:bg-[#0d1520]">
            <div className="mx-auto max-w-6xl px-4 py-16">
              <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-sm dark:bg-[#0b0f14] md:p-10">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-xl font-semibold tracking-tight">Don’t miss out</div>
                    <div className="text-sm text-black/70 dark:text-white/70">
                      Join teachers and get free resources and helpful updates by email. Unsubscribe at any time.
                    </div>
                    <div className="text-sm text-black/70 dark:text-white/70">
                      Read our{" "}
                      <Link href="/privacy-policy" className="underline underline-offset-4">
                        privacy policy
                      </Link>
                      .
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <div className="inline-block bg-yellow-200 px-2 py-0.5 text-xs font-semibold text-black">
                        Name (required)
                      </div>
                      <input
                        className="h-11 w-full rounded-none border-2 border-black bg-white px-3 text-sm text-black outline-none"
                        placeholder="Anna Smith"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="inline-block bg-yellow-200 px-2 py-0.5 text-xs font-semibold text-black">
                        Email (required)
                      </div>
                      <input
                        className="h-11 w-full rounded-none border-2 border-black bg-white px-3 text-sm text-black outline-none"
                        placeholder="anna@gmail.com"
                        type="email"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="inline-block bg-yellow-200 px-2 py-0.5 text-xs font-semibold text-black">
                        Role
                      </div>
                      <select className="h-11 w-full rounded-none border-2 border-black bg-white px-3 text-sm text-black outline-none">
                        <option value="">What describes you best?</option>
                        <option value="teacher">Teacher</option>
                        <option value="tutor">Tutor</option>
                        <option value="school">School admin</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <button type="submit" className="h-11 w-full bg-black text-sm font-semibold text-white">
                      Sign up to the newsletter
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <footer className="border-t border-black/10 bg-white dark:border-white/10 dark:bg-[#0b0f14]">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_1fr_1fr_auto]">
              <div className="space-y-3">
                <div className="text-sm font-semibold">Students</div>
                <div className="space-y-2 text-sm text-black/70 dark:text-white/70">
                  <Link className="block hover:underline" href="/learn">
                    Learn online
                  </Link>
                  <Link className="block hover:underline" href="/learn/templates">
                    Templates
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold">Teachers</div>
                <div className="space-y-2 text-sm text-black/70 dark:text-white/70">
                  <Link className="block hover:underline" href="/learn">
                    Resources
                  </Link>
                  <Link className="block hover:underline" href="/learn/teacher/dashboard">
                    Tutor dashboard
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold">Legal</div>
                <div className="space-y-2 text-sm text-black/70 dark:text-white/70">
                  <Link className="block hover:underline" href="/terms">
                    Terms & conditions
                  </Link>
                  <Link className="block hover:underline" href="/privacy-policy">
                    Privacy policy
                  </Link>
                  <Link className="block hover:underline" href="/cookies">
                    Cookie policy
                  </Link>
                </div>
              </div>

              <div className="flex items-start md:justify-end">
                <div className="flex items-center gap-3">
                  <Logo href="/" />
                  <div className="text-sm font-semibold">EduMax Resources</div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
