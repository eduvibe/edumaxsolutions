import { listTemplates } from "@/lib/platform/store";
import { NextResponse } from "next/server";

export async function GET() {
  const templates = await listTemplates();
  return NextResponse.json({ templates });
}
