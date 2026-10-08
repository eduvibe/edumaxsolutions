import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Download } from "lucide-react";
import { FloatingDecor } from "@/components/FloatingDecor";
import { ParallaxWrapper } from "@/components/ParallaxWrapper";

export function BravoHero() {
  return (
    <section className="relative pt-20 md:pt-32 pb-16 md:pb-24 overflow-hidden bg-background">
      {/* Subtle background wash */}
      <ParallaxWrapper
        offset={100}
        className="absolute inset-0 overflow-hidden pointer-events-none z-0"
      >
        <FloatingDecor />
        <div aria-hidden="true" className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-8 dark:opacity-4">
          <div className="blur-[120px] h-64 bg-foreground/20" />
          <div className="blur-[120px] h-40 bg-foreground/10" />
        </div>
      </ParallaxWrapper>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-14 items-center">

          {/* ── Left — copy ── */}
          <ParallaxWrapper
            offset={-30}
            className="space-y-8 text-center md:text-left animate-in fade-in slide-in-from-bottom-10 duration-1000 ease-out"
          >
            {/* Eyebrow — product label only, no icon clutter */}
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Bravo CBT &mdash; Ed. 2026
            </p>

            {/* Headline — single weight, no mixed bold */}
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-foreground leading-[1.1]">
              56 000 past questions.<br />
              No internet. No excuses.
            </h1>

            {/* Sub-copy — plain, one weight, one colour */}
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
              Bravo CBT is a desktop app for Nigerian students preparing for JAMB UTME and
              WAEC SSCE. Install once, activate once — past questions from 2015 to 2026, full
              mock exams and instant analytics work entirely offline, forever.
            </p>

            {/* Stat row — numbers do the talking */}
            <div className="flex justify-center md:justify-start gap-8 pt-1">
              {[
                { value: "56 000+", label: "Past questions" },
                { value: "12 years", label: "Question bank" },
                { value: "100%", label: "Offline" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center md:text-left">
                  <div className="text-2xl font-extrabold text-foreground tabular-nums">{value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 tracking-wide">{label}</div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Button
                asChild
                size="lg"
                className="bg-foreground hover:bg-foreground/85 text-background font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02]"
              >
                <Link href="/bravo/activate">
                  <Download className="h-4 w-4 mr-2" />
                  Get Activation Key
                </Link>
              </Button>
              {/* Outline on light bg — explicit text colour so it never disappears */}
              <Button
                asChild
                size="lg"
                className="bg-transparent border border-foreground/25 text-foreground hover:bg-foreground/6 font-medium transition-all duration-200"
              >
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>

            {/* Micro note */}
            <p className="text-xs text-muted-foreground">
              App installer coming soon &mdash;{" "}
              <Link href="/bravo/activate" className="underline underline-offset-4 hover:text-foreground transition-colors">
                buy your key now
              </Link>{" "}
              and activate the moment it ships.
            </p>
          </ParallaxWrapper>

          {/* ── Right — app screenshot (Dashboard = bravo-exam.png) ── */}
          <ParallaxWrapper
            offset={-60}
            className="relative group animate-in fade-in zoom-in-95 duration-1000 ease-out delay-300"
          >
            <div className="absolute -inset-px bg-gradient-to-br from-foreground/20 to-transparent rounded-2xl blur-sm opacity-50 group-hover:opacity-70 transition duration-700 animate-tilt" />
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl bg-card">
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50">
                <span className="h-3 w-3 rounded-full bg-foreground/20" />
                <span className="h-3 w-3 rounded-full bg-foreground/12" />
                <span className="h-3 w-3 rounded-full bg-foreground/8" />
                <span className="ml-3 text-xs text-muted-foreground">Bravo CBT &middot; UTME 2026</span>
              </div>
              <Image
                src="/media/bravo-exam.png"
                alt="Bravo CBT — JAMB UTME practice dashboard"
                width={640}
                height={440}
                className="w-full h-auto"
                priority
              />
            </div>
          </ParallaxWrapper>
        </div>
      </div>
    </section>
  );
}
