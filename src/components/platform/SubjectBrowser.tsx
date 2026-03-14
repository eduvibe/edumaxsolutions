"use client";

import type { Subject } from "@/lib/platform/types";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Calculator,
  Dna,
  FlaskConical,
  Globe2,
  Landmark,
  Map,
  Monitor,
  Orbit,
  Palette,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SchoolSection = "primary" | "jss" | "sss";

const sectionLabels: Record<SchoolSection, string> = {
  primary: "Primary",
  jss: "JSS",
  sss: "SSS",
};

function sectionKeyStages(section: SchoolSection): string[] {
  if (section === "primary") return ["KS1", "KS2"];
  if (section === "jss") return ["KS3"];
  return ["KS4"];
}

function getIcon(subject: Subject): LucideIcon {
  switch (subject.slug) {
    case "mathematics":
      return Calculator;
    case "physics":
      return Orbit;
    case "chemistry":
      return FlaskConical;
    case "biology":
      return Dna;
    case "english":
      return BookOpen;
    case "art-and-design":
      return Palette;
    case "computing":
      return Monitor;
    case "geography":
      return Map;
    case "history":
      return Landmark;
    default:
      return Globe2;
  }
}

export function SubjectBrowser({
  subjects,
  stats,
  initialSection,
}: {
  subjects: Subject[];
  stats: Record<string, Record<SchoolSection, { units: number; lessons: number }>>;
  initialSection?: SchoolSection;
}) {
  const [section, setSection] = useState<SchoolSection>(initialSection ?? "primary");

  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  const filtered = useMemo(() => {
    const allowed = sectionKeyStages(section);
    return [...subjects]
      .filter((s) => allowed.some((k) => (s.keyStages ?? []).includes(k)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [section, subjects]);

  return (
    <div className="bg-[#f9f3ee] dark:bg-[#111827]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="text-sm font-semibold text-black/80 dark:text-white/80">Select school section</div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["primary", "jss", "sss"] as const).map((k) => (
            <Link
              key={k}
              href={`/learn/subjects?section=${k}`}
              className={cn(
                "h-10 rounded-md border-2 px-4 text-sm font-semibold",
                section === k
                  ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                  : "border-black bg-white text-black hover:bg-black/5 dark:border-white dark:bg-black dark:text-white dark:hover:bg-white/10"
              )}
            >
              {sectionLabels[k]}
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-black dark:text-white">
            {sectionLabels[section]} subjects
          </h1>
          <p className="mt-2 text-sm text-black/70 dark:text-white/70">
            Free sequenced lesson planning and teaching resources for every national curriculum subject.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((s) => {
            const Icon = getIcon(s);
            const subjectStats = stats[s.slug]?.[section] ?? { units: 0, lessons: 0 };
            return (
              <Link
                key={s.id}
                href={`/learn/subjects/${s.slug}?section=${section}`}
                className="group rounded-xl border border-black/15 bg-white/20 p-6 backdrop-blur-md transition-colors hover:bg-white/30 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <div className="flex items-start justify-between">
                  <Icon className="h-10 w-10 text-black/80 dark:text-white/80" />
                  {s.isNew ? (
                    <span className="rounded-md bg-black px-2 py-1 text-xs font-semibold text-white dark:bg-white dark:text-black">
                      New
                    </span>
                  ) : null}
                </div>
                <div className="mt-5 text-lg font-extrabold tracking-tight text-black dark:text-white">{s.name}</div>

                <div className="mt-6 rounded-lg border border-black/10 bg-white/20 p-4 text-sm text-black backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white">
                  <div>{subjectStats.units} topics</div>
                  <div className="mt-1">{subjectStats.lessons} lessons</div>
                </div>
              </Link>
            );
          })}
        </div>
        {filtered.length === 0 ? (
          <div className="mt-8 rounded-xl border border-black/10 bg-white/30 p-6 text-sm text-black/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            No subjects available for {sectionLabels[section]} yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
