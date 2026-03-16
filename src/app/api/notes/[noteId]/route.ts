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
  return NextResponse.json({ note });
}
