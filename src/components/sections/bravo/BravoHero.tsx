import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Download } from "lucide-react";
import { FloatingDecor } from "@/components/FloatingDecor";
import { ParallaxWrapper } from "@/components/ParallaxWrapper";

export function BravoHero() {
  return (
    <section className="relative pt-20 md:pt-32 pb-16 md:pb-24 overflow-hidden bg-background">
      <ParallaxWrapper
        offset={100}
        className="absolute inset-0 overflow-hidden pointer-events-none z-0"
      >
        <FloatingDecor />
        <div aria-hidden="true" className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-[0.07]">
          <div className="blur-[120px] h-64 bg-foreground/30" />
          <div className="blur-[120px] h-40 bg-foreground/15" />
        </div>
      </ParallaxWrapper>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-14 items-center">

          {/* Left — copy */}
          <ParallaxWrapper
            offset={-30}
            className="space-y-7 text-center md:text-left animate-in fade-in slide-in-from-bottom-10 duration-1000 ease-out"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Bravo CBT &mdash; by EduMax Solutions
            </p>

            <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-foreground leading-[1.1]">
              Practise like it&rsquo;s the<br />
              real exam. Pass like<br />
              you prepared.
            </h1>

            <p className="text-base md:text-[1.05rem] text-muted-foreground leading-relaxed max-w-[420px]">
              Bravo CBT gives Nigerian students a full exam environment on their own device
              — timed mock exams, past questions, instant scoring, and a wrong-answer
              notebook — all without an internet connection.
            </p>

            {/* CTAs — primary solid + secondary explicit-colour border */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start pt-1">
              <Button
                asChild
                size="lg"
                className="bg-foreground hover:bg-foreground/85 text-background font-semibold transition-all duration-200 hover:scale-[1.02]"
              >
                <Link href="/bravo/activate">
                  <Download className="h-4 w-4 mr-2" />
                  Get Activation Key
                </Link>
              </Button>

              {/* Disabled download — awaiting final build */}
              <Button
                size="lg"
                disabled
                className="bg-transparent border border-foreground/20 text-foreground/40 font-medium cursor-not-allowed"
              >
                Download App — Coming Soon
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Purchase your activation key now.{" "}
              <Link href="/bravo/activate" className="underline underline-offset-4 hover:text-foreground transition-colors">
                How activation works &rarr;
              </Link>
            </p>
          </ParallaxWrapper>

          {/* Right — app screenshot */}
          <ParallaxWrapper
            offset={-60}
            className="relative group animate-in fade-in zoom-in-95 duration-1000 ease-out delay-300"
          >
            <div className="absolute -inset-px bg-gradient-to-br from-foreground/20 to-transparent rounded-2xl blur-sm opacity-40 group-hover:opacity-60 transition duration-700 animate-tilt" />
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-2xl bg-card">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50">
                <span className="h-3 w-3 rounded-full bg-foreground/20" />
                <span className="h-3 w-3 rounded-full bg-foreground/12" />
                <span className="h-3 w-3 rounded-full bg-foreground/8" />
                <span className="ml-3 text-xs text-muted-foreground">Bravo CBT &middot; Offline Exam Trainer</span>
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
