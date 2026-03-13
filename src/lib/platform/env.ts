import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  NEXT_PUBLIC_PLATFORM_MODE: z.enum(["demo", "supabase"]).optional(),
});

const serverEnvSchema = z.object({
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().min(1).optional(),
});

export function getPlatformPublicEnv() {
  const parsed = publicEnvSchema.safeParse(process.env);
  const env = parsed.success ? parsed.data : {};

  const platformMode = env.NEXT_PUBLIC_PLATFORM_MODE ?? "demo";

  const supabaseConfigured = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const cloudinaryConfigured = Boolean(env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);

  return {
    platformMode,
    supabaseConfigured,
    cloudinaryConfigured,
    supabase: {
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    cloudinary: {
      cloudName: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    },
  };
}

export function getPlatformServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);
  const env = parsed.success ? parsed.data : {};

  const cloudinarySigningConfigured = Boolean(
    env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
  );

  return {
    cloudinarySigningConfigured,
    cloudinary: {
      apiKey: env.CLOUDINARY_API_KEY,
      apiSecret: env.CLOUDINARY_API_SECRET,
      uploadFolder: env.CLOUDINARY_UPLOAD_FOLDER ?? "edumax",
    },
  };
}

