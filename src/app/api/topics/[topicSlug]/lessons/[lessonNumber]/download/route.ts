import { getTopicResources, listNotesByTopicAndLesson, listQuestionsByTopicAndLesson } from "@/lib/platform/store";
import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";

function safeSlug(value: string) {
  return value.replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "").toLowerCase();
}

function safeFilename(value: string) {
  const parts = value.split(".");
  if (parts.length <= 1) return safeSlug(value) || "file";
  const ext = parts.pop() ?? "bin";
  const base = parts.join(".");
  const safeBase = safeSlug(base) || "file";
  const safeExt = safeSlug(ext) || "bin";
  return `${safeBase}.${safeExt}`;
}

function isCloudinaryUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith("res.cloudinary.com");
  } catch {
    return false;
  }
}

async function fetchCloudinaryFile(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);
  const pathname = new URL(url).pathname;
  const base = pathname.split("/").pop() || "file";
  const filename = base.includes(".") ? base : `${base}.bin`;
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, filename: safeFilename(filename) };
}

export async function GET(_req: NextRequest, context: { params: Promise<{ topicSlug: string; lessonNumber: string }> }) {
  const { topicSlug, lessonNumber: lessonNumberRaw } = await context.params;
  const lessonNumber = Number.parseInt(lessonNumberRaw, 10);

  if (!Number.isFinite(lessonNumber) || lessonNumber <= 0) {
    return NextResponse.json({ error: "Invalid lesson number" }, { status: 400 });
  }

  const resources = await getTopicResources(topicSlug);
  if (!resources) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const { subject, topic, templates } = resources;

  const zip = new JSZip();
  const root = zip.folder(`${subject.slug}/${topic.slug}/lesson-${String(lessonNumber).padStart(2, "0")}`) ?? zip;

  const [notes, questions] = await Promise.all([
    listNotesByTopicAndLesson(topic.slug, lessonNumber),
    listQuestionsByTopicAndLesson(topic.slug, lessonNumber),
  ]);
  const lessonTemplates = templates.filter((t) => (t.lessonNumber ?? null) === lessonNumber);

  root.file(
    "manifest.json",
    JSON.stringify(
      {
        subject: { id: subject.id, slug: subject.slug, name: subject.name },
        topic: { id: topic.id, slug: topic.slug, name: topic.name, yearGroup: topic.yearGroup ?? null },
        lessonNumber,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  const notesFolder = root.folder("notes") ?? root;
  for (const n of notes) {
    notesFolder.file(`${n.id}.txt`, `${n.title}\n\n${n.content}\n`);
    if (n.featuredImageUrl && isCloudinaryUrl(n.featuredImageUrl)) {
      try {
        const file = await fetchCloudinaryFile(n.featuredImageUrl);
        notesFolder.file(`${n.id}-image-${file.filename}`, file.bytes, { binary: true });
      } catch {
        notesFolder.file(`${n.id}-image.url.txt`, `${n.featuredImageUrl}\n`);
      }
    } else if (n.featuredImageUrl) {
      notesFolder.file(`${n.id}-image.url.txt`, `${n.featuredImageUrl}\n`);
    }
  }

  const quizFolder = root.folder("quizzes") ?? root;
  for (const q of questions) {
    quizFolder.file(`${q.id}.json`, JSON.stringify(q, null, 2));
    if (q.questionImageUrl && isCloudinaryUrl(q.questionImageUrl)) {
      try {
        const file = await fetchCloudinaryFile(q.questionImageUrl);
        quizFolder.file(`${q.id}-image-${file.filename}`, file.bytes, { binary: true });
      } catch {
        quizFolder.file(`${q.id}-image.url.txt`, `${q.questionImageUrl}\n`);
      }
    } else if (q.questionImageUrl) {
      quizFolder.file(`${q.id}-image.url.txt`, `${q.questionImageUrl}\n`);
    }
  }

  const resourcesFolder = root.folder("resources") ?? root;
  for (const t of lessonTemplates) {
    const ext = t.fileUrl.split("?")[0].split(".").pop();
    const fallbackName = `${t.id}-${safeSlug(t.title)}.${ext && ext.length <= 8 ? ext : "bin"}`;
    if (isCloudinaryUrl(t.fileUrl)) {
      try {
        const file = await fetchCloudinaryFile(t.fileUrl);
        resourcesFolder.file(`${t.resourceType ?? "slides"}/${file.filename || fallbackName}`, file.bytes, { binary: true });
      } catch {
        resourcesFolder.file(`${t.id}.${(t.resourceType ?? "slides")}.url.txt`, `${t.title}\n${t.description}\n\n${t.fileUrl}\n`);
      }
    } else {
      resourcesFolder.file(`${t.id}.${(t.resourceType ?? "slides")}.url.txt`, `${t.title}\n${t.description}\n\n${t.fileUrl}\n`);
    }
  }

  const content = await zip.generateAsync({ type: "uint8array" });
  const filename = `${topic.slug}-lesson-${lessonNumber}.zip`;
  const buf = content.buffer as ArrayBuffer;
  const body = buf.slice(content.byteOffset, content.byteOffset + content.byteLength);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
