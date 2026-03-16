import { NextResponse } from "next/server";
import { mcqCreateSchema } from "@/lib/schemas";
import { createMcqQuestion } from "@/lib/platform/store";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = mcqCreateSchema.safeParse(body);
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
      const input = parsed.data;
      const { error, data } = await supabase
        .from("mcq_questions")
        .insert({
          id: crypto.randomUUID(),
          subject_slug: input.subjectSlug,
          topic_slug: input.topicSlug,
          lesson_number: input.lessonNumber,
          author_id: user.id,
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
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ question: { id: data.id } }, { status: 201 });
    }

    const q = await createMcqQuestion(parsed.data);
    return NextResponse.json({ question: q }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
