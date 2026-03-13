import { NextResponse } from "next/server";
import { noteCreateSchema } from "@/lib/schemas";
import { createNote } from "@/lib/platform/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = noteCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { subjectSlug, topicSlug, title, content, featuredImageUrl, published } =
      parsed.data;

    const note = createNote({
      subjectSlug,
      topicSlug,
      title,
      content,
      featuredImageUrl: featuredImageUrl ? featuredImageUrl : null,
      published,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

