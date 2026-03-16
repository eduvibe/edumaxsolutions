import { getTopicResources, listLessonsByTopicSlug, listNotesByTopicAndLesson, listQuestionsByTopicAndLesson } from "@/lib/platform/store";
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
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const pathname = new URL(url).pathname;
  const base = pathname.split("/").pop() || "file";
  const filename = base.includes(".") ? base : `${base}.bin`;
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, filename: safeFilename(filename), contentType };
}

export async function GET(_req: NextRequest, context: { params: Promise<{ topicSlug: string }> }) {
  const { topicSlug } = await context.params;
  const resources = await getTopicResources(topicSlug);
  if (!resources) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const { subject, topic, templates } = resources;
  const lessons = listLessonsByTopicSlug(topic.slug);

  const zip = new JSZip();
  const root = zip.folder(`${subject.slug}/${topic.slug}`) ?? zip;

  root.file(
    "manifest.json",
    JSON.stringify(
      {
        subject: { id: subject.id, slug: subject.slug, name: subject.name },
        topic: { id: topic.id, slug: topic.slug, name: topic.name, yearGroup: topic.yearGroup ?? null },
        lessons: lessons.map((l) => ({ number: l.lessonNumber, title: l.title })),
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  for (const lesson of lessons) {
    const lessonFolder =
      root.folder(`lesson-${String(lesson.lessonNumber).padStart(2, "0")}-${safeSlug(lesson.title)}`) ?? root;
    lessonFolder.file(
      "lesson.json",
      JSON.stringify(
        {
          lessonNumber: lesson.lessonNumber,
          title: lesson.title,
          objective: lesson.objective ?? null,
        },
        null,
        2
      )
    );

    const [notes, questions] = await Promise.all([
      listNotesByTopicAndLesson(topic.slug, lesson.lessonNumber),
      listQuestionsByTopicAndLesson(topic.slug, lesson.lessonNumber),
    ]);
    const lessonTemplates = templates.filter((t) => (t.lessonNumber ?? null) === lesson.lessonNumber);

    const notesFolder = lessonFolder.folder("notes") ?? lessonFolder;
    for (const n of notes) {
      notesFolder.file(
        `${n.id}.txt`,
        `${n.title}\n\n${n.content}\n`
      );
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

    const quizFolder = lessonFolder.folder("quizzes") ?? lessonFolder;
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

    const resourcesFolder = lessonFolder.folder("resources") ?? lessonFolder;
    for (const t of lessonTemplates) {
      const ext = t.fileUrl.split("?")[0].split(".").pop();
      const fallbackName = `${t.id}-${safeSlug(t.title)}.${ext && ext.length <= 8 ? ext : "bin"}`;
      if (isCloudinaryUrl(t.fileUrl)) {
        try {
          const file = await fetchCloudinaryFile(t.fileUrl);
          resourcesFolder.file(`${t.resourceType ?? "slides"}/${file.filename || fallbackName}`, file.bytes, { binary: true });
        } catch {
          resourcesFolder.file(
            `${t.id}.${(t.resourceType ?? "slides")}.url.txt`,
            `${t.title}\n${t.description}\n\n${t.fileUrl}\n`
          );
        }
      } else {
        resourcesFolder.file(
          `${t.id}.${(t.resourceType ?? "slides")}.url.txt`,
          `${t.title}\n${t.description}\n\n${t.fileUrl}\n`
        );
      }
    }
  }

  const content = await zip.generateAsync({ type: "uint8array" });
  const filename = `${topic.slug}.zip`;
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
