import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Download, MessageCircle, WifiOff } from "lucide-react";

export function BravoCta() {
  return (
    <section id="download" className="py-16 md:py-24 bg-foreground text-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left — logo + copy */}
          <div className="space-y-6 text-center md:text-left animate-in fade-in slide-in-from-left-12 duration-700 ease-out">
            {/* Logo */}
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="h-14 w-14 rounded-2xl bg-background flex items-center justify-center shadow-lg overflow-hidden p-1.5">
                <Image
                  src="/media/chtlogo.png"
                  alt="Bravo CBT logo"
                  width={52}
                  height={52}
                  className="object-contain"
                />
              </div>
              <div className="text-left">
                <div className="text-xl font-extrabold tracking-tight text-background">Bravo CBT</div>
                <div className="text-xs text-background/60 font-medium">by EduMax Solutions</div>
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-background leading-tight">
              Start practising today.<br />
              No Wi-Fi needed — ever.
            </h2>

            <p className="text-lg text-background/70 max-w-md">
              Download Bravo CBT, activate once, and get unlimited access to{" "}
              <strong className="text-background">56 000+ JAMB and WAEC past questions</strong> — completely offline, forever.
            </p>

            {/* Offline pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-4 py-2 text-sm font-medium text-background">
              <WifiOff className="h-4 w-4" />
              Works with zero internet after activation
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-2">
              <Button
                asChild
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 shadow-lg transform hover:scale-[1.03] transition-all duration-300 font-bold"
              >
                <Link href="/bravo/activate">
                  <span className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Get Activation Key
                  </span>
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-background/30 text-background hover:bg-background/10 hover:text-background transform hover:scale-[1.03] transition-all duration-300"
              >
                <Link href="/contact">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Contact Us
                  </span>
                </Link>
              </Button>
            </div>
            <p className="text-sm text-background/50 pt-1">
              App download link coming soon — purchase your key now and activate the moment it launches.
            </p>
          </div>

          {/* Right — spec cards */}
          <div
            className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-12 duration-700 ease-out delay-200"
          >
            {[
              { value: "56 000+", label: "Past Questions" },
              { value: "2015–2026", label: "Year Coverage" },
              { value: "JAMB & WAEC", label: "Exams Covered" },
              { value: "Offline", label: "Works Without Internet" },
              { value: "Mock + Practice", label: "Two Exam Modes" },
              { value: "Auto Notebook", label: "Wrong-Answer Review" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="rounded-xl border border-background/15 bg-background/8 p-5 text-center hover:bg-background/12 transition-colors duration-200"
              >
                <div className="text-2xl font-extrabold text-background">{value}</div>
                <div className="text-xs text-background/55 mt-1 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
