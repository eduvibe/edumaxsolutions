import {
  Clock,
  BookOpen,
  BarChart3,
  BookMarked,
  Search,
  Wifi,
  ListChecks,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "JAMB & WAEC Past Questions",
    description:
      "Complete question bank covering JAMB UTME and WAEC SSCE from 2015 to the current edition — thousands of verified questions across all subjects.",
  },
  {
    icon: Clock,
    title: "Full Mock Exams",
    description:
      "Timed, full-paper simulations with a live countdown timer, question palette, flag-for-review, and auto-submit when time expires — just like the real CBT.",
  },
  {
    icon: Zap,
    title: "Practice Mode",
    description:
      "Answer questions one at a time and get instant feedback with detailed explanations after each answer — ideal for targeted learning.",
  },
  {
    icon: Search,
    title: "Browse by Year & Subject",
    description:
      "Filter and drill any past question paper by specific year and subject. Study exactly what you need, when you need it.",
  },
  {
    icon: BarChart3,
    title: "Result Analytics",
    description:
      "After every session see a score ring, per-subject breakdown, and a UTME /400 projection so students always know where they stand.",
  },
  {
    icon: BookMarked,
    title: "Wrong-Answer Notebook",
    description:
      "Every question answered incorrectly is automatically saved into a personal notebook for focused revision — zero manual effort.",
  },
  {
    icon: ListChecks,
    title: "Subject Selection & Shuffle",
    description:
      "Pick exactly the four UTME subjects you're sitting. Shuffle questions or answers to prevent pattern memorisation.",
  },
  {
    icon: Wifi,
    title: "Works 100% Offline",
    description:
      "Download once, activate once. After that, every exam, every result, every notebook entry stays entirely on-device — no data, no Wi-Fi, no surprises.",
  },
];

export function BravoFeatures() {
  return (
    <section id="features" className="py-16 md:py-24 bg-muted/40">
      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-14 animate-in fade-in slide-in-from-top-8 duration-700 ease-out">
          <span className="inline-block py-1 px-3 rounded-full bg-foreground/8 text-foreground text-sm font-semibold tracking-wide uppercase border border-foreground/15 mb-4">
            Everything You Need
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Built for serious exam prep
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Every feature in Bravo CBT is designed around one goal — getting Nigerian students ready to score high on JAMB and WAEC.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative bg-card rounded-2xl border border-border/60 p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              {/* Icon */}
              <div className="mb-4 inline-flex items-center justify-center h-11 w-11 rounded-xl bg-foreground/6 border border-foreground/10 group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                <feature.icon className="h-5 w-5 text-foreground group-hover:text-background transition-colors duration-300" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2 leading-snug">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
