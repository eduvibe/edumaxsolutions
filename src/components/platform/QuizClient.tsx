"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { McqOptionKey, McqQuestion } from "@/lib/platform/types";
import { useMemo, useState } from "react";

type QuizState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; questions: McqQuestion[] }
  | { status: "submitted"; questions: McqQuestion[]; answers: Record<string, McqOptionKey>; score: number };

export function QuizClient({ topicSlug, topicName }: { topicSlug: string; topicName: string }) {
  const { toast } = useToast();
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
      const res = await fetch(`/api/questions/quiz?topicSlug=${encodeURIComponent(topicSlug)}&limit=${encodeURIComponent(limit)}`);
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
      <Card>
        <CardHeader>
          <CardTitle>Practice Test: {topicName}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Number of questions</Label>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-[220px]">
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

          <div className="flex gap-3">
            <Button onClick={generateQuiz} disabled={isBusy}>
              Generate quiz
            </Button>
            <Button onClick={submitQuiz} disabled={!canSubmit || quiz.status !== "ready"} variant="secondary">
              Submit
            </Button>
          </div>

          {quiz.status === "submitted" ? (
            <div className="ml-auto text-sm">
              Score: <span className="font-semibold">{quiz.score}</span> / {quiz.questions.length}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {questions.length === 0 ? null : (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const selected = answers[q.id];
            const showReview = quiz.status === "submitted";
            return (
              <Card key={q.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {idx + 1}. {q.questionText}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup
                    value={selected ?? ""}
                    onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v as McqOptionKey }))}
                    disabled={showReview}
                    className="space-y-2"
                  >
                    {([
                      ["A", q.optionAText] as const,
                      ["B", q.optionBText] as const,
                      ["C", q.optionCText] as const,
                      ["D", q.optionDText] as const,
                    ]).map(([key, text]) => {
                      const isCorrect = showReview && key === q.correctAnswer;
                      const isWrongSelected = showReview && selected === key && selected !== q.correctAnswer;
                      return (
                        <div
                          key={key}
                          className={[
                            "flex items-start gap-3 rounded-md border p-3 transition-colors",
                            isCorrect ? "border-emerald-500/60 bg-emerald-500/5" : "",
                            isWrongSelected ? "border-rose-500/60 bg-rose-500/5" : "",
                          ].join(" ")}
                        >
                          <RadioGroupItem id={`${q.id}_${key}`} value={key} />
                          <Label htmlFor={`${q.id}_${key}`} className="cursor-pointer flex-1">
                            <span className="font-medium mr-2">{key}.</span>
                            {text}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>

                  {showReview ? (
                    <div className="rounded-md border bg-muted/30 p-4 text-sm">
                      <div>
                        Correct answer: <span className="font-semibold">{q.correctAnswer}</span>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap">{q.explanation}</div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

