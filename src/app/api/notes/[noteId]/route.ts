import { getNoteById } from "@/lib/platform/store";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: { noteId: string } }
) {
  const note = getNoteById(ctx.params.noteId);
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ note });
}

