import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Download, ArrowRight, WifiOff, ShieldCheck } from "lucide-react";
import { FloatingDecor } from "@/components/FloatingDecor";
import { ParallaxWrapper } from "@/components/ParallaxWrapper";

const badges = [
  { icon: WifiOff, label: "100% Offline" },
  { icon: ShieldCheck, label: "Verified Questions" },
  { icon: ArrowRight, label: "2015 → 2026 Bank" },
];

export function BravoHero() {
  return (
    <section className="relative pt-20 md:pt-32 pb-16 md:pb-24 bg-gradient-to-br from-foreground/5 via-background to-background overflow-hidden">
      {/* Background layer */}
      <ParallaxWrapper
        offset={100}
        className="absolute inset-0 overflow-hidden pointer-events-none z-0"
      >
        <FloatingDecor />
        <div
          aria-hidden="true"
          className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-10 dark:opacity-5"
        >
          <div className="blur-[106px] h-56 bg-gradient-to-br from-foreground/30 to-foreground/10" />
          <div className="blur-[106px] h-32 bg-gradient-to-r from-foreground/20 to-foreground/5" />
        </div>
      </ParallaxWrapper>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <ParallaxWrapper
            offset={-30}
            className="space-y-6 text-center md:text-left animate-in fade-in slide-in-from-bottom-10 duration-1000 ease-out"
          >
            {/* Product eyebrow */}
            <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-foreground">
              <WifiOff className="h-3.5 w-3.5" />
              New Product — Fully Offline
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
              Ace JAMB &amp; WAEC.<br />
              <span className="relative">
                No Internet
                <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-foreground/20 rounded-full" />
              </span>{" "}
              Required.
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
              <strong className="text-foreground">Bravo CBT</strong> is a downloadable desktop app packed with{" "}
              <strong className="text-foreground">56 000+ past questions</strong> for JAMB UTME and WAEC SSCE
              (2015 → 2026). Full mock exams, practice drills, analytics — everything works{" "}
              <strong className="text-foreground">after one-time activation</strong>.
            </p>

            {/* Badges */}
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              {badges.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
                >
                  <Icon className="h-3.5 w-3.5 text-foreground/60" />
                  {label}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-2">
              <Button
                asChild
                size="lg"
                className="bg-foreground hover:bg-foreground/80 text-background shadow-lg transform hover:scale-[1.03] transition-all duration-300"
              >
                <Link href="#download">
                  <span className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Download Bravo CBT
                  </span>
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="shadow-lg transform hover:scale-[1.03] transition-all duration-300 border-foreground/30 text-foreground hover:bg-foreground/5"
              >
                <Link href="#features">
                  <span className="flex items-center gap-2">
                    See Features
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </Link>
              </Button>
            </div>

            {/* Stat strip */}
            <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-2 border-t border-border/50">
              {[
                { value: "56 000+", label: "Past Questions" },
                { value: "2015–2026", label: "Year Coverage" },
                { value: "Zero", label: "Internet Needed" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center md:text-left">
                  <div className="text-2xl font-extrabold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </ParallaxWrapper>

          {/* Right — app screenshot */}
          <ParallaxWrapper
            offset={-60}
            className="relative group animate-in fade-in zoom-in-95 duration-1000 ease-out delay-300"
          >
            {/* Subtle glow border */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-foreground/25 via-foreground/10 to-foreground/5 rounded-xl blur opacity-40 group-hover:opacity-60 transition duration-1000 animate-tilt" />
            {/* Window chrome */}
            <div className="relative rounded-xl overflow-hidden border border-border shadow-2xl bg-card">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/60">
                <span className="h-3 w-3 rounded-full bg-foreground/20" />
                <span className="h-3 w-3 rounded-full bg-foreground/15" />
                <span className="h-3 w-3 rounded-full bg-foreground/10" />
                <span className="ml-3 text-xs text-muted-foreground font-medium">
                  Bravo CBT — Offline JAMB &amp; WAEC Trainer
                </span>
              </div>
              <Image
                src="/media/bravo-dashboard.png"
                alt="Bravo CBT dashboard showing JAMB UTME practice interface"
                width={620}
                height={430}
                className="w-full h-auto object-cover"
                priority
                data-ai-hint="CBT exam app dashboard"
              />
            </div>
          </ParallaxWrapper>
        </div>
      </div>
    </section>
  );
}
