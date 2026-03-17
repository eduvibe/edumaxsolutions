"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FormattedText } from "@/components/platform/FormattedText";
import { RichTextRenderer } from "@/components/platform/RichTextRenderer";
import type { McqOptionKey, McqQuestion } from "@/lib/platform/types";
import { useMemo, useState } from "react";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/platform/supabaseBrowser";
import { useRouter } from "next/navigation";

type QuizState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; questions: McqQuestion[] }
  | { status: "submitted"; questions: McqQuestion[]; answers: Record<string, McqOptionKey>; score: number };

export function QuizClient({
  topicSlug,
  topicName,
  lessonNumber,
}: {
  topicSlug: string;
  topicName: string;
  lessonNumber?: number;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [limit, setLimit] = useState("10");
  const [quiz, setQuiz] = useState<QuizState>({ status: "idle" });
  const [answers, setAnswers] = useState<Record<string, McqOptionKey>>({});

  const isBusy = quiz.status === "loading";

  const canSubmit = useMemo(() => {
    if (quiz.status !== "ready") return false;
    return quiz.questions.every((q) => Boolean(answers[q.id]));
  }, [answers, quiz]);

  async function generateQuiz() {
    setQuiz({ status: "loading" });
    setAnswers({});
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({ title: "Sign in required", description: "Sign in to start a quiz and save progress." });
        const returnTo = `${window.location.pathname}${window.location.search}`;
        router.push(`/learn/account?returnTo=${encodeURIComponent(returnTo)}`);
        setQuiz({ status: "idle" });
        return;
      }

      const url = new URL(`/api/questions/quiz`, window.location.origin);
      url.searchParams.set("topicSlug", topicSlug);
      url.searchParams.set("limit", limit);
      if (typeof lessonNumber === "number" && Number.isFinite(lessonNumber)) url.searchParams.set("lesson", String(lessonNumber));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load quiz");
      const data = (await res.json()) as { questions: McqQuestion[] };
      setQuiz({ status: "ready", questions: data.questions });
      if (data.questions.length === 0) {
        toast({ title: "No questions found", description: "This topic doesn't have questions yet." });
      }
    } catch (e) {
      setQuiz({ status: "idle" });
      toast({ title: "Quiz error", description: e instanceof Error ? e.message : "Unable to generate quiz." });
    }
  }

  function submitQuiz() {
    if (quiz.status !== "ready") return;
    const score = quiz.questions.reduce((acc, q) => {
      const selected = answers[q.id];
      return acc + (selected === q.correctAnswer ? 1 : 0);
    }, 0);
    setQuiz({ status: "submitted", questions: quiz.questions, answers, score });
  }

  const questions = quiz.status === "ready" ? quiz.questions : quiz.status === "submitted" ? quiz.questions : [];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-black/10 bg-white/10 p-6 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="text-xl font-semibold tracking-tight">Practice test</div>
            <div className="text-sm text-black/70 dark:text-white/70">{topicName}</div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label className="text-black/70 dark:text-white/70">Number of questions</Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger className="h-10 w-[220px] rounded-full border-black/10 bg-white/60 shadow-sm focus-visible:ring-0 dark:border-white/10 dark:bg-white/5">
                  <SelectValue placeholder="Choose amount" />
                </SelectTrigger>
                <SelectContent>
                  {["5", "10", "15", "20"].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={generateQuiz} disabled={isBusy} className="rounded-full">
              Generate
            </Button>
            <Button
              onClick={submitQuiz}
              disabled={!canSubmit || quiz.status !== "ready"}
              variant="secondary"
              className="rounded-full bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Submit
            </Button>
          </div>
        </div>

        {quiz.status === "submitted" ? (
          <div className="mt-4 text-sm text-black/70 dark:text-white/70">
            Score: <span className="font-semibold text-black dark:text-white">{quiz.score}</span> / {quiz.questions.length}
          </div>
        ) : null}
      </div>

      {questions.length === 0 ? null : (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const selected = answers[q.id];
            const showReview = quiz.status === "submitted";
            return (
              <div key={q.id} className="rounded-3xl border border-black/10 bg-white/5 p-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:p-6">
                <div className="text-base font-semibold tracking-tight">
                  <span className="mr-1">{idx + 1}.</span>
                  {q.questionTextJson ? (
                    <RichTextRenderer doc={q.questionTextJson} className="inline" />
                  ) : (
                    <FormattedText text={q.questionText} className="inline" />
                  )}
                </div>
                {q.questionImageUrl ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-black/10 bg-white/10 dark:border-white/10 dark:bg-white/5">
                    <div className="relative aspect-[16/9] w-full">
                      <Image src={q.questionImageUrl} alt="" fill className="object-contain" sizes="(max-width: 768px) 100vw, 900px" />
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 space-y-4">
                  <RadioGroup
                    value={selected ?? ""}
                    onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v as McqOptionKey }))}
                    disabled={showReview}
                    className="space-y-2"
                  >
                    {([
                      ["A", q.optionAText, q.optionATextJson, q.optionAImageUrl] as const,
                      ["B", q.optionBText, q.optionBTextJson, q.optionBImageUrl] as const,
                      ["C", q.optionCText, q.optionCTextJson, q.optionCImageUrl] as const,
                      ["D", q.optionDText, q.optionDTextJson, q.optionDImageUrl] as const,
                    ]).map(([key, text, textJson, imageUrl]) => {
                      const isCorrect = showReview && key === q.correctAnswer;
                      const isWrongSelected = showReview && selected === key && selected !== q.correctAnswer;
                      return (
                        <div
                          key={key}
                          className={[
                            "flex items-start gap-3 rounded-2xl border border-black/10 bg-white/10 p-3 backdrop-blur-md transition-colors dark:border-white/10 dark:bg-white/5",
                            isCorrect ? "border-emerald-500/60 bg-emerald-500/5" : "",
                            isWrongSelected ? "border-rose-500/60 bg-rose-500/5" : "",
                          ].join(" ")}
                        >
                          <RadioGroupItem id={`${q.id}_${key}`} value={key} />
                          <Label htmlFor={`${q.id}_${key}`} className="cursor-pointer flex-1">
                            <span className="font-medium mr-2">{key}.</span>
                            {textJson ? (
                              <RichTextRenderer doc={textJson} className="inline" />
                            ) : (
                              <FormattedText text={text} className="inline" />
                            )}
                            {imageUrl ? (
                              <div className="mt-2 overflow-hidden rounded-xl border border-black/10 bg-white/10 dark:border-white/10 dark:bg-white/5">
                                <div className="relative aspect-[16/9] w-full">
                                  <Image
                                    src={imageUrl}
                                    alt=""
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 768px) 100vw, 700px"
                                  />
                                </div>
                              </div>
                            ) : null}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>

                  {showReview ? (
                    <div className="rounded-2xl border border-black/10 bg-white/10 p-4 text-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
                      <div>
                        Correct answer: <span className="font-semibold">{q.correctAnswer}</span>
                      </div>
                      {q.explanationJson ? (
                        <RichTextRenderer doc={q.explanationJson} className="mt-2" />
                      ) : (
                        <FormattedText text={q.explanation} className="mt-2" />
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
