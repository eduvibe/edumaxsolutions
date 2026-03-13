import { NextResponse } from "next/server";
import { mcqCreateSchema } from "@/lib/schemas";
import { createMcqQuestion } from "@/lib/platform/store";

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

    const q = createMcqQuestion(parsed.data);
    return NextResponse.json({ question: q }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

