import { getPlatformServerEnv } from "@/lib/platform/env";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  const env = getPlatformServerEnv();
  if (!env.cloudinarySigningConfigured || !env.cloudinary.apiSecret || !env.cloudinary.apiKey) {
    return NextResponse.json(
      {
        error: "Cloudinary signing is not configured",
        hint: "Set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in server environment variables",
      },
      { status: 501 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { folder?: string };
  const folder = body.folder?.trim() || env.cloudinary.uploadFolder;
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${env.cloudinary.apiSecret}`;
  const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

  return NextResponse.json({
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: env.cloudinary.apiKey,
    timestamp,
    folder,
    signature,
  });
}

