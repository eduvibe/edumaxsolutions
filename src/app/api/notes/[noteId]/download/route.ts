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

  const raw = note.content ?? "";
  const isProbablyHtml = /<(p|div|h2|h3|ul|ol|li|img|a)\b/i.test(raw);
  const text = isProbablyHtml
    ? raw
        .replace(/<\s*br\s*\/?>/gi, "\n")
        .replace(/<\/\s*p\s*>/gi, "\n")
        .replace(/<\/\s*h2\s*>/gi, "\n")
        .replace(/<\/\s*h3\s*>/gi, "\n")
        .replace(/<\/\s*li\s*>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : raw;

  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameSafe || "note"}.txt"`,
    },
  });
}
