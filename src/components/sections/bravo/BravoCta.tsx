import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Download } from "lucide-react";

const highlights = [
  "Full mock exams with timer and auto-submit",
  "Practice mode with instant answer explanations",
  "Wrong-answer notebook built automatically",
  "Works completely offline after one activation",
];

export function BravoCta() {
  return (
    <section id="download" className="py-20 md:py-28 bg-foreground">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* Left — logo, headline, CTAs */}
          <div className="space-y-7 animate-in fade-in slide-in-from-left-12 duration-700 ease-out">

            {/* Logo lockup */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-background flex items-center justify-center overflow-hidden p-1.5 shrink-0">
                <Image
                  src="/media/chtlogo.png"
                  alt="Bravo CBT"
                  width={44}
                  height={44}
                  className="object-contain"
                />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight text-background leading-none">Bravo CBT</div>
                <div className="text-xs text-background/50 mt-0.5">by EduMax Solutions</div>
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-background leading-[1.15]">
              Your preparation starts<br />
              here. Not on exam day.
            </h2>

            <p className="text-base text-background/60 max-w-sm leading-relaxed">
              Get your activation key, install the app, and start practising with the same exam format Nigerian students face on the actual day.
            </p>

            {/* CTAs — primary light bg + explicit-colour border button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button
                asChild
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 font-semibold transition-all duration-200 hover:scale-[1.02]"
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
                className="bg-transparent border border-background/20 text-background/40 font-medium cursor-not-allowed"
              >
                Download App — Coming Soon
              </Button>
            </div>

            {/* Contact — plain text link, always visible on dark bg */}
            <p className="text-sm text-background/50">
              Questions?{" "}
              <Link
                href="/contact"
                className="text-background underline underline-offset-4 hover:text-background/80 transition-colors"
              >
                Contact us
              </Link>
            </p>
          </div>

          {/* Right — plain feature list, no cards */}
          <div
            className="space-y-0 animate-in fade-in slide-in-from-right-12 duration-700 ease-out delay-150"
          >
            {highlights.map((item, i) => (
              <div
                key={item}
                className="flex items-start gap-4 py-5 border-t border-background/12 first:border-t-0"
              >
                <span className="text-xs font-bold tabular-nums text-background/25 mt-0.5 w-5 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-sm font-medium text-background/75 leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
