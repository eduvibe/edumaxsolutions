import { NextResponse } from "next/server";
import { mcqCreateSchema } from "@/lib/schemas";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";
import { getQuestionById, updateMcqQuestion } from "@/lib/platform/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const env = getPlatformPublicEnv();

  if (env.platformMode === "supabase" && env.supabaseConfigured) {
    const auth = await requireTutor(_req);
    if ("error" in auth) return auth.error;
    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from("mcq_questions")
      .select("*")
      .eq("id", id)
      .eq("author_id", user.id)
      .single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      question: {
        id: data.id,
        subjectSlug: data.subject_slug,
        topicSlug: data.topic_slug,
        lessonNumber: data.lesson_number,
        questionText: data.question_text,
        questionTextJson: data.question_text_json ?? null,
        questionImageUrl: data.question_image_url ?? "",
        optionAText: data.option_a_text,
        optionATextJson: data.option_a_text_json ?? null,
        optionAImageUrl: data.option_a_image_url ?? "",
        optionBText: data.option_b_text,
        optionBTextJson: data.option_b_text_json ?? null,
        optionBImageUrl: data.option_b_image_url ?? "",
        optionCText: data.option_c_text,
        optionCTextJson: data.option_c_text_json ?? null,
        optionCImageUrl: data.option_c_image_url ?? "",
        optionDText: data.option_d_text,
        optionDTextJson: data.option_d_text_json ?? null,
        optionDImageUrl: data.option_d_image_url ?? "",
        correctAnswer: data.correct_answer,
        explanation: data.explanation,
        explanationJson: data.explanation_json ?? null,
      },
    });
  }

  const q = await getQuestionById(id);
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    question: {
      id: q.id,
      subjectSlug: "",
      topicSlug: "",
      lessonNumber: q.lessonNumber ?? null,
      questionText: q.questionText,
      questionTextJson: q.questionTextJson ?? null,
      questionImageUrl: q.questionImageUrl ?? "",
      optionAText: q.optionAText,
      optionATextJson: q.optionATextJson ?? null,
      optionAImageUrl: q.optionAImageUrl ?? "",
      optionBText: q.optionBText,
      optionBTextJson: q.optionBTextJson ?? null,
      optionBImageUrl: q.optionBImageUrl ?? "",
      optionCText: q.optionCText,
      optionCTextJson: q.optionCTextJson ?? null,
      optionCImageUrl: q.optionCImageUrl ?? "",
      optionDText: q.optionDText,
      optionDTextJson: q.optionDTextJson ?? null,
      optionDImageUrl: q.optionDImageUrl ?? "",
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      explanationJson: q.explanationJson ?? null,
    },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const parsed = mcqCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const env = getPlatformPublicEnv();
    if (env.platformMode === "supabase" && env.supabaseConfigured) {
      const auth = await requireTutor(req);
      if ("error" in auth) return auth.error;
      const { supabase, user } = auth;
      const input = parsed.data;

      const { data, error } = await supabase
        .from("mcq_questions")
        .update({
          subject_slug: input.subjectSlug,
          topic_slug: input.topicSlug,
          lesson_number: input.lessonNumber ?? null,
          question_text: input.questionText,
          question_text_json: input.questionTextJson ?? null,
          question_image_url: input.questionImageUrl ? input.questionImageUrl : null,
          option_a_text: input.optionAText,
          option_a_text_json: input.optionATextJson ?? null,
          option_a_image_url: input.optionAImageUrl ? input.optionAImageUrl : null,
          option_b_text: input.optionBText,
          option_b_text_json: input.optionBTextJson ?? null,
          option_b_image_url: input.optionBImageUrl ? input.optionBImageUrl : null,
          option_c_text: input.optionCText,
          option_c_text_json: input.optionCTextJson ?? null,
          option_c_image_url: input.optionCImageUrl ? input.optionCImageUrl : null,
          option_d_text: input.optionDText,
          option_d_text_json: input.optionDTextJson ?? null,
          option_d_image_url: input.optionDImageUrl ? input.optionDImageUrl : null,
          correct_answer: input.correctAnswer,
          explanation: input.explanation,
          explanation_json: input.explanationJson ?? null,
        })
        .eq("id", id)
        .eq("author_id", user.id)
        .select("id")
        .single();
      if (error || !data) return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 400 });
      return NextResponse.json({ ok: true, id: data.id }, { status: 200 });
    }

    await updateMcqQuestion(id, parsed.data);
    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
