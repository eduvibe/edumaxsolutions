import { NextResponse } from "next/server";
import { listEssaysByTopicSlug } from "@/lib/platform/store";

export async function GET(
  _req: Request,
  ctx: { params: { topicSlug: string } }
) {
  const essays = listEssaysByTopicSlug(ctx.params.topicSlug);
  return NextResponse.json({ essays });
}

