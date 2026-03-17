"use client";

import type { Subject, Topic } from "@/lib/platform/types";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { curriculumLessonsByTopicSlug } from "@/lib/platform/curriculum";
import { useRouter } from "next/navigation";

export function TeacherTopicNotePicker({ subjects, topics }: { subjects: Subject[]; topics: Topic[] }) {
  const router = useRouter();
  const [subjectSlug, setSubjectSlug] = useState(subjects[0]?.slug ?? "");
  const [topicSlug, setTopicSlug] = useState("");
  const [lessonNumber, setLessonNumber] = useState<number | null>(null);

  const topicOptions = useMemo(() => topics.filter((t) => t.subjectId === subjects.find((s) => s.slug === subjectSlug)?.id), [topics, subjects, subjectSlug]);

  const lessonOptions = useMemo(() => {
    if (!topicSlug) return [];
    const defs = curriculumLessonsByTopicSlug[topicSlug] ?? [];
    return defs.map((d, idx) => ({ number: idx + 1, title: d.title }));
  }, [topicSlug]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div>
        <div className="text-sm font-semibold text-black/80 dark:text-white/80">Subject</div>
        <div className="mt-2">
          <Select
            value={subjectSlug}
            onValueChange={(v) => {
              setSubjectSlug(v);
              setTopicSlug("");
              setLessonNumber(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.slug}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-black/80 dark:text-white/80">Topic</div>
        <div className="mt-2">
          <Select
            value={topicSlug}
            onValueChange={(v) => {
              setTopicSlug(v);
              setLessonNumber(null);
            }}
            disabled={topicOptions.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={topicOptions.length ? "Select topic" : "No topics"} />
            </SelectTrigger>
            <SelectContent>
              {topicOptions.map((t) => (
                <SelectItem key={t.id} value={t.slug}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-black/80 dark:text-white/80">Sub-topic</div>
        <div className="mt-2">
          <Select value={lessonNumber ? String(lessonNumber) : ""} onValueChange={(v) => setLessonNumber(Number(v))} disabled={lessonOptions.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={lessonOptions.length ? "Select sub-topic" : "No sub-topics"} />
            </SelectTrigger>
            <SelectContent>
              {lessonOptions.map((l) => (
                <SelectItem key={l.number} value={String(l.number)}>
                  {l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="md:col-span-3 flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          className="rounded-md bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          disabled={!topicSlug || !lessonNumber}
          onClick={() => router.push(`/learn/teacher/topic-notes/${topicSlug}/lessons/${lessonNumber}`)}
        >
          Open note
        </Button>
      </div>
    </div>
  );
}

