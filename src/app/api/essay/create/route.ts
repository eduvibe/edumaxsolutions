import { NextResponse } from "next/server";
import { essayCreateSchema } from "@/lib/schemas";
import { createEssayQuestion } from "@/lib/platform/store";

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

    const essay = createEssayQuestion({
      subjectSlug: parsed.data.subjectSlug,
      topicSlug: parsed.data.topicSlug,
      questionText: parsed.data.questionText,
      referenceAnswer: parsed.data.referenceAnswer ? parsed.data.referenceAnswer : null,
    });

    return NextResponse.json({ essay }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

