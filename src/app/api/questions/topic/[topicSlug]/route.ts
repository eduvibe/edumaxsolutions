import { NextRequest, NextResponse } from "next/server";
import { listQuestionsByTopicSlug } from "@/lib/platform/store";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ topicSlug: string }> }
) {
  const { topicSlug } = await ctx.params;
  const questions = listQuestionsByTopicSlug(topicSlug);
  return NextResponse.json({ questions });
}
