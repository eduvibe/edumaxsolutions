import Image from "next/image";
import { ParallaxWrapper } from "@/components/ParallaxWrapper";

const screens = [
  {
    src: "/media/bravo-dashboard.png",
    alt: "Bravo CBT dashboard — JAMB UTME practice home",
    caption: "Dashboard",
    description:
      "At a glance: question count, your personal best, average score, and one-tap access to every feature.",
  },
  {
    src: "/media/bravo-exam.png",
    alt: "Bravo CBT exam setup — subject selection and session options",
    caption: "Exam Setup",
    description:
      "Choose your exam mode, select subjects, set time, and customise your session before every mock.",
  },
];

export function BravoScreenshots() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-14 animate-in fade-in slide-in-from-top-8 duration-700 ease-out">
          <span className="inline-block py-1 px-3 rounded-full bg-foreground/8 text-foreground text-sm font-semibold tracking-wide uppercase border border-foreground/15 mb-4">
            Inside the App
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Clean. Fast. Focused.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Bravo CBT&apos;s interface is designed to get out of the way and let students concentrate on what matters — answering questions.
          </p>
        </div>

        {/* Screenshot pairs */}
        <div className="grid md:grid-cols-2 gap-10">
          {screens.map((screen, index) => (
            <ParallaxWrapper
              key={screen.caption}
              offset={index % 2 === 0 ? 25 : -25}
              className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 ease-out"
              smooth
            >
              {/* App window wrapper */}
              <div className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-foreground/20 to-foreground/5 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-700" />
                <div className="relative rounded-xl overflow-hidden border border-border shadow-xl bg-card">
                  {/* Fake window chrome */}
                  <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/60">
                    <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
                    <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                    <span className="h-2.5 w-2.5 rounded-full bg-foreground/10" />
                    <span className="ml-3 text-xs text-muted-foreground font-medium">
                      Bravo CBT · UTME 2026
                    </span>
                  </div>
                  <Image
                    src={screen.src}
                    alt={screen.alt}
                    width={700}
                    height={480}
                    className="w-full h-auto object-cover"
                    data-ai-hint="CBT exam software"
                  />
                </div>
              </div>

              {/* Caption */}
              <div className="px-1">
                <h3 className="text-lg font-bold text-foreground">{screen.caption}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {screen.description}
                </p>
              </div>
            </ParallaxWrapper>
          ))}
        </div>
      </div>
    </section>
  );
}
