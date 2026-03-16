import { z } from "zod";

const trimmed = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() : v), schema);

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: trimmed(z.string().url()).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: trimmed(z.string().min(1)).optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: trimmed(z.string().min(1)).optional(),
  NEXT_PUBLIC_PLATFORM_MODE: trimmed(z.enum(["demo", "supabase"])).optional(),
  NEXT_PUBLIC_RESOURCES_STATUS: trimmed(z.enum(["live", "coming_soon"])).optional(),
});

const serverEnvSchema = z.object({
  CLOUDINARY_API_KEY: trimmed(z.string().min(1)).optional(),
  CLOUDINARY_API_SECRET: trimmed(z.string().min(1)).optional(),
  CLOUDINARY_UPLOAD_FOLDER: trimmed(z.string().min(1)).optional(),
  SUPABASE_SERVICE_ROLE_KEY: trimmed(z.string().min(1)).optional(),
});

export function getPlatformPublicEnv() {
  const parsed = publicEnvSchema.safeParse(process.env);
  const env = parsed.success ? parsed.data : {};

  const platformMode = env.NEXT_PUBLIC_PLATFORM_MODE ?? "demo";
  const resourcesStatus = env.NEXT_PUBLIC_RESOURCES_STATUS ?? "live";

  const supabaseConfigured = Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const cloudinaryConfigured = Boolean(env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);

  return {
    platformMode,
    resourcesStatus,
    resourcesComingSoon: resourcesStatus === "coming_soon",
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

  const cloudinaryApiKey = env.CLOUDINARY_API_KEY ?? process.env["API Key"];
  const cloudinarySigningConfigured = Boolean(
    cloudinaryApiKey && env.CLOUDINARY_API_SECRET
  );

  return {
    cloudinarySigningConfigured,
    cloudinary: {
      apiKey: cloudinaryApiKey,
      apiSecret: env.CLOUDINARY_API_SECRET,
      uploadFolder: env.CLOUDINARY_UPLOAD_FOLDER ?? "edumax",
    },
    supabase: {
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
  };
}
