import { NextResponse } from "next/server";
import { getPlatformServerEnv } from "@/lib/platform/env";
import { requireTutor } from "@/app/api/_lib/supabaseAuth";
import crypto from "crypto";

export async function POST(req: Request) {
  const auth = await requireTutor(req);
  if ("error" in auth) return auth.error;

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

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 501 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const folderRaw = form.get("folder");
    const folder = typeof folderRaw === "string" && folderRaw.trim() ? folderRaw.trim() : env.cloudinary.uploadFolder;
    if (!(file instanceof Blob)) return NextResponse.json({ error: "Missing file" }, { status: 400 });

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${env.cloudinary.apiSecret}`;
    const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

    const body = new FormData();
    body.set("file", file);
    body.set("api_key", env.cloudinary.apiKey);
    body.set("timestamp", String(timestamp));
    body.set("folder", folder);
    body.set("signature", signature);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: "POST",
      body,
    });
    const uploadData = (await uploadRes.json().catch(() => ({}))) as { secure_url?: string; url?: string; error?: { message?: string } };
    if (!uploadRes.ok) {
      return NextResponse.json({ error: uploadData.error?.message ?? "Upload failed" }, { status: 400 });
    }
    const url = uploadData.secure_url ?? uploadData.url;
    if (!url) return NextResponse.json({ error: "Cloudinary did not return a URL" }, { status: 400 });
    return NextResponse.json({ url }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

