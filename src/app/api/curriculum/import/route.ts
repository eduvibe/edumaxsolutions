import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { requireAdmin } from "@/app/api/_lib/supabaseAuth";

type CsvRow = Record<string, string>;

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function keyStagesFromSection(section: "primary" | "jss" | "sss"): string[] {
  if (section === "primary") return ["KS1", "KS2"];
  if (section === "jss") return ["KS3"];
  return ["KS4"];
}

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  function pushField() {
    current.push(field);
    field = "";
  }
  function pushRow() {
    rows.push(current);
    current = [];
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushField();
      continue;
    }
    if (ch === "\n") {
      pushField();
      pushRow();
      continue;
    }
    if (ch === "\r") continue;
    field += ch;
  }
  pushField();
  if (current.some((c) => c.trim().length > 0)) pushRow();

  const header = rows.shift();
  if (!header) return [];
  const headers = header.map(normalizeHeader);
  return rows
    .filter((r) => r.some((c) => c.trim().length > 0))
    .map((r) => {
      const obj: CsvRow = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] ?? "").trim();
      });
      return obj;
    });
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function deriveYearOrder(yearGroup: string | null | undefined) {
  if (!yearGroup) return null;
  const m = yearGroup.trim().match(/(\d{1,2})/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0 || n > 20) return null;
  return n;
}

const rowSchema = z.object({
  subject: z.string().min(2),
  subject_slug: z.string().optional(),
  section: z.enum(["primary", "jss", "sss"]),
  year_group: z.string().optional(),
  topic: z.string().min(2),
  topic_slug: z.string().optional(),
  lessons: z.string().optional(),
});

export async function POST(req: Request) {
  const env = getPlatformPublicEnv();
  if (!(env.platformMode === "supabase" && env.supabaseConfigured)) {
    return NextResponse.json({ error: "Not supported in demo mode" }, { status: 501 });
  }

  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  const supabase = auth.supabase;

  const contentType = req.headers.get("content-type") ?? "";
  let csvText = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (file instanceof File) {
      csvText = await file.text();
    } else {
      const pasted = form.get("csv");
      csvText = typeof pasted === "string" ? pasted : "";
    }
  } else {
    const body = (await req.json().catch(() => ({}))) as { csv?: string };
    csvText = typeof body.csv === "string" ? body.csv : "";
  }

  if (!csvText.trim()) return NextResponse.json({ error: "Missing CSV" }, { status: 400 });

  const parsed = parseCsv(csvText);
  if (parsed.length === 0) return NextResponse.json({ error: "No rows found" }, { status: 400 });

  const errors: { row: number; error: string }[] = [];
  const normalizedRows: Array<z.infer<typeof rowSchema>> = [];

  for (let i = 0; i < parsed.length; i++) {
    const r = parsed[i];
    const candidate = {
      subject: r.subject || r.subject_name || "",
      subject_slug: r.subject_slug || "",
      section: (r.section || r.school_section || "").toLowerCase(),
      year_group: r.year_group || r.class || r.year || "",
      topic: r.topic || r.topic_name || "",
      topic_slug: r.topic_slug || "",
      lessons: r.lessons || r.lesson_titles || "",
    };
    const check = rowSchema.safeParse(candidate);
    if (!check.success) {
      errors.push({ row: i + 2, error: "Invalid row" });
      continue;
    }
    normalizedRows.push(check.data);
  }

  if (normalizedRows.length === 0) return NextResponse.json({ error: "No valid rows", details: errors }, { status: 400 });

  const subjectAgg = new Map<string, { name: string; slug: string; keyStages: Set<string> }>();
  for (const r of normalizedRows) {
    const slug = (r.subject_slug?.trim() || slugify(r.subject)).trim();
    const existing = subjectAgg.get(slug);
    if (!existing) {
      subjectAgg.set(slug, { name: r.subject.trim(), slug, keyStages: new Set(keyStagesFromSection(r.section)) });
    } else {
      keyStagesFromSection(r.section).forEach((k) => existing.keyStages.add(k));
      if (!existing.name && r.subject.trim()) existing.name = r.subject.trim();
    }
  }

  const subjectSlugs = Array.from(subjectAgg.keys());
  if (subjectSlugs.length > 0) {
    const existingSubjectsRes = await supabase.from("curriculum_subjects").select("slug,key_stages").in("slug", subjectSlugs);
    if (existingSubjectsRes.error) return NextResponse.json({ error: existingSubjectsRes.error.message }, { status: 400 });
    for (const raw of existingSubjectsRes.data ?? []) {
      const s = raw as Record<string, unknown>;
      const slug = typeof s.slug === "string" ? s.slug : "";
      if (!slug) continue;
      const agg = subjectAgg.get(slug);
      if (!agg) continue;
      const ks = Array.isArray(s.key_stages) ? (s.key_stages as unknown[]).filter((x): x is string => typeof x === "string") : [];
      ks.forEach((k) => agg.keyStages.add(k));
    }
  }

  const subjectsToUpsert = Array.from(subjectAgg.values()).map((s) => ({
    name: s.name,
    slug: s.slug,
    key_stages: Array.from(s.keyStages),
    is_new: null,
  }));
  const upSubj = await supabase.from("curriculum_subjects").upsert(subjectsToUpsert, { onConflict: "slug" }).select("id,slug");
  if (upSubj.error) return NextResponse.json({ error: upSubj.error.message }, { status: 400 });
  const subjectIdBySlug = new Map((upSubj.data ?? []).map((s) => [s.slug as string, s.id as string]));

  const topicAgg = new Map<
    string,
    {
      topicSlug: string;
      topicName: string;
      subjectSlug: string;
      section: "primary" | "jss" | "sss";
      yearGroup: string | null;
      lessons: string[];
    }
  >();

  for (const r of normalizedRows) {
    const subjectSlug = (r.subject_slug?.trim() || slugify(r.subject)).trim();
    const autoTopicSlug = slugify([r.topic, r.section, (r.year_group ?? "").trim()].filter(Boolean).join(" "));
    const topicSlug = (r.topic_slug?.trim() || autoTopicSlug).trim();
    const yearGroup = r.year_group?.trim() ? r.year_group.trim() : null;
    const lessons = (r.lessons ?? "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);

    const existing = topicAgg.get(topicSlug);
    if (!existing) {
      topicAgg.set(topicSlug, {
        topicSlug,
        topicName: r.topic.trim(),
        subjectSlug,
        section: r.section,
        yearGroup,
        lessons: [...lessons],
      });
    } else {
      if (existing.subjectSlug !== subjectSlug) {
        errors.push({ row: 0, error: `Topic short link "${topicSlug}" is used under multiple subjects. Provide a unique topic_slug per subject.` });
        continue;
      }
      if (existing.section !== r.section) {
        errors.push({ row: 0, error: `Topic short link "${topicSlug}" is used under multiple sections. Provide a unique topic_slug per section.` });
        continue;
      }
      if (existing.yearGroup && yearGroup && existing.yearGroup !== yearGroup) {
        errors.push({ row: 0, error: `Topic short link "${topicSlug}" has conflicting year_group values. Provide a unique topic_slug per year group.` });
        continue;
      }
      if (!existing.topicName && r.topic.trim()) existing.topicName = r.topic.trim();
      if (!existing.yearGroup && yearGroup) existing.yearGroup = yearGroup;
      for (const t of lessons) {
        if (!existing.lessons.includes(t)) existing.lessons.push(t);
      }
    }
  }

  const topicsToUpsert: Array<Record<string, unknown>> = [];
  for (const t of topicAgg.values()) {
    const subjectId = subjectIdBySlug.get(t.subjectSlug);
    if (!subjectId) continue;
    topicsToUpsert.push({
      subject_id: subjectId,
      name: t.topicName,
      slug: t.topicSlug,
      description: null,
      year_group: t.yearGroup,
      year_order: deriveYearOrder(t.yearGroup),
      thread: null,
      school_section: t.section,
      lesson_count: null,
    });
  }

  const upTopics = await supabase.from("curriculum_topics").upsert(topicsToUpsert, { onConflict: "slug" }).select("id,slug");
  if (upTopics.error) return NextResponse.json({ error: upTopics.error.message }, { status: 400 });
  const topicIdBySlug = new Map((upTopics.data ?? []).map((t) => [t.slug as string, t.id as string]));

  const lessonRows: Array<Record<string, unknown>> = [];
  for (const t of topicAgg.values()) {
    const topicId = topicIdBySlug.get(t.topicSlug);
    if (!topicId) continue;
    t.lessons.forEach((title, idx) => {
      lessonRows.push({ topic_id: topicId, lesson_number: idx + 1, title, objective: null });
    });
  }

  if (lessonRows.length > 0) {
    const upLessons = await supabase.from("curriculum_lessons").upsert(lessonRows, { onConflict: "topic_id,lesson_number" });
    if (upLessons.error) return NextResponse.json({ error: upLessons.error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      ok: true,
      subjects: subjectsToUpsert.length,
      topics: topicsToUpsert.length,
      lessons: lessonRows.length,
      details: errors,
    },
    { status: 200 }
  );
}
