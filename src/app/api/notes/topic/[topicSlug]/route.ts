import { NextRequest, NextResponse } from "next/server";
import { listNotesByTopicSlug } from "@/lib/platform/store";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ topicSlug: string }> }
) {
  const { topicSlug } = await ctx.params;
  const notes = await listNotesByTopicSlug(topicSlug);
  return NextResponse.json({ notes });
}
