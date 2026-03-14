import { getRandomQuestions } from "@/lib/platform/store";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const topicSlug = url.searchParams.get("topicSlug") ?? "";
  const limitRaw = url.searchParams.get("limit") ?? "10";
  const lessonRaw = url.searchParams.get("lesson") ?? "";
  const limit = Number.parseInt(limitRaw, 10);
  const lessonNumber = lessonRaw ? Number.parseInt(lessonRaw, 10) : undefined;

  if (!topicSlug) {
    return NextResponse.json({ error: "topicSlug is required" }, { status: 400 });
  }

  const questions = getRandomQuestions(
    topicSlug,
    Number.isFinite(limit) ? limit : 10,
    Number.isFinite(lessonNumber ?? Number.NaN) ? lessonNumber : undefined
  );
  return NextResponse.json({ questions });
}
