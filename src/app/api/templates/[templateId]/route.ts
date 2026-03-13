import { getTemplateById, incrementTemplateDownloads } from "@/lib/platform/store";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: { templateId: string } }
) {
  const tpl = getTemplateById(ctx.params.templateId);
  if (!tpl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  incrementTemplateDownloads(tpl.id);
  return NextResponse.redirect(tpl.fileUrl, 302);
}

