import { NextResponse } from "next/server";
import { listNotesByTopicSlug } from "@/lib/platform/store";

export async function GET(
  _req: Request,
  ctx: { params: { topicSlug: string } }
) {
  const { topicSlug } = ctx.params;
  const notes = listNotesByTopicSlug(topicSlug);
  return NextResponse.json({ notes });
}
