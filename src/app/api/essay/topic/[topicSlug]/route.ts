import { NextRequest, NextResponse } from "next/server";
import { listEssaysByTopicSlug } from "@/lib/platform/store";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ topicSlug: string }> }
) {
  const { topicSlug } = await ctx.params;
  const essays = await listEssaysByTopicSlug(topicSlug);
  return NextResponse.json({ essays });
}
