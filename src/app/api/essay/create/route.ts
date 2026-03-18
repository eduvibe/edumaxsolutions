import { NextResponse } from "next/server";
import { essayCreateSchema } from "@/lib/schemas";
import { createEssayQuestion } from "@/lib/platform/store";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = essayCreateSchema.safeParse(body);
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
        .from("essay_questions")
        .insert({
          id: crypto.randomUUID(),
          subject_slug: input.subjectSlug,
          topic_slug: input.topicSlug,
          lesson_number: input.lessonNumber ?? null,
          author_id: user.id,
          question_text: input.questionText,
          reference_answer: input.referenceAnswer ? input.referenceAnswer : null,
        })
        .select("id")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ essay: { id: data.id } }, { status: 201 });
    }

    const essay = await createEssayQuestion({
      subjectSlug: parsed.data.subjectSlug,
      topicSlug: parsed.data.topicSlug,
      lessonNumber: parsed.data.lessonNumber,
      questionText: parsed.data.questionText,
      referenceAnswer: parsed.data.referenceAnswer ? parsed.data.referenceAnswer : null,
    });

    return NextResponse.json({ essay }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
