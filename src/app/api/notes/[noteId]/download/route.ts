import { getNoteById } from "@/lib/platform/store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await ctx.params;
  const note = await getNoteById(noteId);
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filenameSafe = note.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return new NextResponse(note.content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameSafe || "note"}.txt"`,
    },
  });
}
