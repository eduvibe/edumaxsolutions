import { NextResponse } from "next/server";
import { z } from "zod";
import { mcqCreateSchema } from "@/lib/schemas";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";
import { createMcqQuestion } from "@/lib/platform/store";

const bulkSchema = z.object({
  questions: z.array(mcqCreateSchema).min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as unknown;
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const env = getPlatformPublicEnv();
    if (env.platformMode === "supabase" && env.supabaseConfigured) {
      const auth = await requireTutor(req);
      if ("error" in auth) return auth.error;
      const { supabase, user } = auth;

      const rows = parsed.data.questions.map((q) => ({
        id: crypto.randomUUID(),
        subject_slug: q.subjectSlug,
        topic_slug: q.topicSlug,
        lesson_number: q.lessonNumber,
        author_id: user.id,
        question_text: q.questionText,
        question_text_json: q.questionTextJson ?? null,
        question_image_url: q.questionImageUrl ? q.questionImageUrl : null,
        option_a_text: q.optionAText,
        option_a_text_json: q.optionATextJson ?? null,
        option_a_image_url: q.optionAImageUrl ? q.optionAImageUrl : null,
        option_b_text: q.optionBText,
        option_b_text_json: q.optionBTextJson ?? null,
        option_b_image_url: q.optionBImageUrl ? q.optionBImageUrl : null,
        option_c_text: q.optionCText,
        option_c_text_json: q.optionCTextJson ?? null,
        option_c_image_url: q.optionCImageUrl ? q.optionCImageUrl : null,
        option_d_text: q.optionDText,
        option_d_text_json: q.optionDTextJson ?? null,
        option_d_image_url: q.optionDImageUrl ? q.optionDImageUrl : null,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        explanation_json: q.explanationJson ?? null,
      }));

      const { error } = await supabase.from("mcq_questions").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, count: rows.length }, { status: 201 });
    }

    for (const q of parsed.data.questions) {
      await createMcqQuestion(q);
    }
    return NextResponse.json({ ok: true, count: parsed.data.questions.length }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
