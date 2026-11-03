// Uploads the Bravo desktop installer (.exe) to Cloudinary as a RAW (non-image) public asset
// and prints the forced-download URL to set as BRAVO_DOWNLOAD_URL.
//
// Usage (secrets come from the environment, never committed):
//   CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=... NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=... \
//     node scripts/upload-bravo-exe.mjs ./BravoCBT-Setup-1.4.0.exe
//
// Optional: BRAVO_EXE_PUBLIC_ID=bravo-cbt-setup  (default; versioned names also fine)
import { createReadStream, statSync } from "node:fs";
import { createHash } from "node:crypto";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/upload-bravo-exe.mjs <path-to-setup.exe>");
  process.exit(1);
}
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
if (!apiKey || !apiSecret || !cloudName) {
  console.error("CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET and NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME must be set");
  process.exit(1);
}

const stat = statSync(file);
const publicId = process.env.BRAVO_EXE_PUBLIC_ID?.trim() || "bravo-cbt-setup";
const folder = "edumax/downloads";
const timestamp = Math.floor(Date.now() / 1000);
const params = `folder=${folder}&public_id=${publicId}&resource_type=raw&timestamp=${timestamp}`;
const signature = createHash("sha1").update(params + apiSecret).digest("hex");

const form = new FormData();
form.append("file", new Blob([createReadStream(file)]), file.split("/").pop());
form.append("api_key", apiKey);
form.append("timestamp", String(timestamp));
form.append("signature", signature);
form.append("folder", folder);
form.append("public_id", publicId);
form.append("resource_type", "raw");

const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, { method: "POST", body: form });
const data = await res.json();
if (!res.ok) {
  console.error("Cloudinary upload failed:", data?.error?.message ?? res.status);
  process.exit(1);
}
console.log("uploaded:", data.secure_url);
console.log("\nSet this in the Vercel environment as BRAVO_DOWNLOAD_URL (forces a browser download):");
console.log(`https://res.cloudinary.com/${cloudName}/raw/upload/fl_attachment/${folder}/${publicId}.exe`);
console.log(`(file size: ${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
