import { getTemplateById, incrementTemplateDownloads } from "@/lib/platform/store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await ctx.params;
  const tpl = getTemplateById(templateId);
  if (!tpl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  incrementTemplateDownloads(tpl.id);
  return NextResponse.redirect(tpl.fileUrl, 302);
}
