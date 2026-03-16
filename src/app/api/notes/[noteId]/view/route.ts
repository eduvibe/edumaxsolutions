import { incrementNoteViews } from "@/lib/platform/store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await ctx.params;
  const note = await incrementNoteViews(noteId);
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, views: note.views });
}
