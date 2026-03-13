import { createTopic } from "@/lib/platform/store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    subjectSlug?: string;
    name?: string;
    description?: string | null;
    yearGroup?: string | null;
    thread?: string | null;
    lessonCount?: number | null;
    schoolSection?: "primary" | "jss" | "sss" | null;
  };

  if (!body.subjectSlug || !body.name) {
    return NextResponse.json({ error: "Missing subjectSlug or name" }, { status: 400 });
  }

  try {
    const topic = createTopic({
      subjectSlug: body.subjectSlug,
      name: body.name,
      description: body.description ?? null,
      yearGroup: body.yearGroup ?? null,
      thread: body.thread ?? null,
      lessonCount: typeof body.lessonCount === "number" ? body.lessonCount : null,
      schoolSection: body.schoolSection ?? null,
    });
    return NextResponse.json({ topic });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unable to create topic" }, { status: 500 });
  }
}
