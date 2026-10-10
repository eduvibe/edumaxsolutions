import Image from "next/image";
import { ParallaxWrapper } from "@/components/ParallaxWrapper";

// ⚠ Image mapping: bravo-exam.png = Dashboard home, bravo-dashboard.png = Exam Setup screen
const screens = [
  {
    src: "/media/bravo-exam.png",
    alt: "Bravo CBT — JAMB UTME practice dashboard",
    label: "Dashboard",
    description:
      "The home screen shows your question count, personal best, and average score at a glance. Every feature is one tap away.",
  },
  {
    src: "/media/bravo-dashboard.png",
    alt: "Bravo CBT — exam setup, subject selection and session options",
    label: "Exam Setup",
    description:
      "Pick your mode, select subjects, set the timer, and shuffle options. The session is yours to configure before every mock.",
  },
];

export function BravoScreenshots() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">

        {/* Header — left-aligned */}
        <div className="max-w-xl mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Inside the app
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            Familiar format.<br />Built for focus.
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-md">
            Bravo CBT&apos;s interface matches the real JAMB CBT environment — so by exam day, there are no surprises.
          </p>
        </div>

        {/* Screenshots side by side */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {screens.map((screen, index) => (
            <ParallaxWrapper
              key={screen.label}
              offset={index % 2 === 0 ? 20 : -20}
              className="flex flex-col gap-5"
              smooth
            >
              {/* Window frame */}
              <div className="rounded-xl overflow-hidden border border-border shadow-lg bg-card">
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/60">
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/12" />
                  <span className="h-2.5 w-2.5 rounded-full bg-foreground/8" />
                  <span className="ml-3 text-xs text-muted-foreground">Bravo CBT &middot; UTME 2026</span>
                </div>
                <Image
                  src={screen.src}
                  alt={screen.alt}
                  width={700}
                  height={480}
                  className="w-full h-auto block"
                />
              </div>

              {/* Label + description — no card wrapper */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">
                  {screen.label}
                </p>
                <p className="text-sm text-foreground/75 leading-relaxed">
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
