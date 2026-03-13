import { listTemplates } from "@/lib/platform/store";
import { NextResponse } from "next/server";

export async function GET() {
  const templates = listTemplates();
  return NextResponse.json({ templates });
}

