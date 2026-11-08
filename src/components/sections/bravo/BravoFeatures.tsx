const capabilities = [
  {
    number: "01",
    title: "Mock exams that mirror the real CBT",
    body: "Full timed papers with a countdown, question palette, flag-for-review, and auto-submit. The same pressure, the same format — before the exam hall.",
  },
  {
    number: "02",
    title: "Practice mode with instant explanations",
    body: "Work through questions one at a time. Every wrong answer shows the correct option and why — so students understand, not just memorise.",
  },
  {
    number: "03",
    title: "Past questions from 2015 to 2026",
    body: "Over 56 000 verified JAMB UTME and WAEC SSCE questions organised by year and subject. Filter to a single year or drill the full bank.",
  },
  {
    number: "04",
    title: "Original questions, carefully quality-checked",
    body: "Alongside publicly available past questions, students practise with original questions designed to assess the same concepts, rigour, and skills set out in the syllabus. Each goes through multiple checks for accuracy, relevance, and reliability.",
  },
  {
    number: "05",
    title: "Score ring and UTME /400 projection",
    body: "After every session a score ring shows subject-by-subject performance and projects a UTME total out of 400 — students see exactly where they stand.",
  },
  {
    number: "06",
    title: "Automatic wrong-answer notebook",
    body: "Every question answered incorrectly is silently saved. Students revisit a focused revision list without having to note anything themselves.",
  },
  {
    number: "07",
    title: "One activation. Zero ongoing internet.",
    body: "Install, activate once, and the app is yours. Exams, results, and the notebook stay on the device — no data, no Wi-Fi, no subscription.",
  },
];

export function BravoFeatures() {
  return (
    <section id="features" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 md:px-6">

        {/* Section label + headline — left-aligned, not centred */}
        <div className="max-w-xl mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
            What it does
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            Everything a student needs.<br />Nothing they don&apos;t.
          </h2>
        </div>

        {/* Two-column numbered list — no cards, just typography and line */}
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-0">
          {capabilities.map((item, i) => (
            <div
              key={item.number}
              className="group flex gap-6 py-8 border-t border-border/60 animate-in fade-in slide-in-from-bottom-6 duration-500 ease-out"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Number — large, light, decorative */}
              <span className="text-[2.5rem] font-extrabold text-foreground/10 leading-none tabular-nums select-none shrink-0 mt-0.5 group-hover:text-foreground/20 transition-colors duration-300">
                {item.number}
              </span>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-foreground leading-snug">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <aside id="disclaimer" className="mt-12 max-w-3xl border-t border-border/60 pt-6">
          <h3 className="text-sm font-bold text-foreground">Question content disclaimer</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Bravo CBT combines publicly available past questions with original practice questions designed to assess the same concepts, rigour, and skills covered by the published syllabus. Original questions undergo multiple checks for accuracy, relevance, and reliability. They are supplementary practice materials; use the official syllabus and exam guidance as the authoritative source.
          </p>
        </aside>
      </div>
    </section>
  );
}
