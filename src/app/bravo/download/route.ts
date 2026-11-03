// GET /bravo/download — stable public download entry point for the Bravo desktop app (.exe).
// Redirects (302) to BRAVO_DOWNLOAD_URL, which should be a forced-download URL on the file host
// (e.g. Cloudinary raw delivery with fl_attachment). Until the final build is uploaded and the
// variable is set, it returns 503 "coming soon".
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.BRAVO_DOWNLOAD_URL?.trim();
  if (!url || !/^https:\/\//.test(url)) {
    return NextResponse.json(
      { error: "download_not_available", message: "The Bravo app download is coming soon." },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
  return NextResponse.redirect(url, { status: 302 });
}
