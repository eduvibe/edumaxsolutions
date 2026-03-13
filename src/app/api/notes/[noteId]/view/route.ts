import { incrementNoteViews } from "@/lib/platform/store";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  ctx: { params: { noteId: string } }
) {
  const note = incrementNoteViews(ctx.params.noteId);
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, views: note.views });
}

