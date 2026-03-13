import { NextResponse } from "next/server";
import { listQuestionsByTopicSlug } from "@/lib/platform/store";

export async function GET(
  _req: Request,
  ctx: { params: { topicSlug: string } }
) {
  const questions = listQuestionsByTopicSlug(ctx.params.topicSlug);
  return NextResponse.json({ questions });
}

