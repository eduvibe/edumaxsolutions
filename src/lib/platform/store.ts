import type {
  EssayQuestion,
  McqQuestion,
  Note,
  PresentationTemplate,
  Subject,
  TeacherPublicProfile,
  Topic,
  TopicResources,
} from "@/lib/platform/types";

type PlatformStore = {
  teachers: TeacherPublicProfile[];
  subjects: Subject[];
  topics: Topic[];
  notes: Note[];
  questions: McqQuestion[];
  essays: EssayQuestion[];
  templates: PresentationTemplate[];
};

const DEMO_TEACHER_ID = "teacher_demo_1";

function nowIso() {
  return new Date().toISOString();
}

function seedStore(): PlatformStore {
  const teachers: TeacherPublicProfile[] = [
    {
      id: DEMO_TEACHER_ID,
      name: "Demo Teacher",
      dateJoined: nowIso(),
      role: "teacher",
      subjectSpecialty: "Mathematics",
    },
  ];

  const subjects: Subject[] = [
    { id: "sub_math", name: "Mathematics", slug: "mathematics" },
    { id: "sub_phy", name: "Physics", slug: "physics" },
    { id: "sub_chem", name: "Chemistry", slug: "chemistry" },
    { id: "sub_bio", name: "Biology", slug: "biology" },
    { id: "sub_eng", name: "English", slug: "english" },
  ];

  const topics: Topic[] = [
    {
      id: "top_quad",
      subjectId: "sub_math",
      name: "Quadratic Equations",
      slug: "quadratic-equations",
      description: "Factorisation, completing the square, and the quadratic formula.",
    },
    {
      id: "top_newton",
      subjectId: "sub_phy",
      name: "Newton's Laws",
      slug: "newtons-laws",
      description: "Forces, inertia, and motion in one dimension.",
    },
    {
      id: "top_mole",
      subjectId: "sub_chem",
      name: "Mole Concept",
      slug: "mole-concept",
      description: "Molar mass, Avogadro number, and stoichiometry basics.",
    },
  ];

  const notes: Note[] = [
    {
      id: "note_1",
      title: "Quadratic Equations: Quick Guide",
      content:
        "A quadratic equation has the form ax^2 + bx + c = 0.\n\nCommon solution methods:\n1) Factorisation\n2) Completing the square\n3) Quadratic formula: x = (-b ± √(b^2 - 4ac)) / 2a",
      subjectId: "sub_math",
      topicId: "top_quad",
      authorId: DEMO_TEACHER_ID,
      featuredImageUrl: null,
      dateCreated: nowIso(),
      dateUpdated: null,
      views: 0,
      published: true,
    },
  ];

  const questions: McqQuestion[] = [
    {
      id: "q_1",
      subjectId: "sub_math",
      topicId: "top_quad",
      authorId: DEMO_TEACHER_ID,
      questionText: "Solve: x^2 - 5x + 6 = 0",
      questionImageUrl: null,
      optionAText: "x = 2 or x = 3",
      optionAImageUrl: null,
      optionBText: "x = -2 or x = -3",
      optionBImageUrl: null,
      optionCText: "x = 1 or x = 6",
      optionCImageUrl: null,
      optionDText: "x = -1 or x = -6",
      optionDImageUrl: null,
      correctAnswer: "A",
      explanation: "Factorise: (x - 2)(x - 3) = 0, so x = 2 or 3.",
      dateCreated: nowIso(),
    },
  ];

  const essays: EssayQuestion[] = [
    {
      id: "e_1",
      subjectId: "sub_phy",
      topicId: "top_newton",
      authorId: DEMO_TEACHER_ID,
      questionText:
        "Explain Newton's First Law of Motion and give one real-life example.",
      referenceAnswer:
        "An object remains at rest or in uniform motion unless acted upon by a net external force. Example: a book on a table stays at rest until pushed.",
      dateCreated: nowIso(),
    },
  ];

  const templates: PresentationTemplate[] = [
    {
      id: "t_1",
      title: "Lesson Plan Deck",
      description: "A clean slide deck layout for structured lesson delivery.",
      subjectCategory: "General",
      fileUrl: "https://example.com/templates/lesson-plan.pptx",
      previewImageUrl: null,
      uploadedBy: DEMO_TEACHER_ID,
      dateUploaded: nowIso(),
      downloads: 0,
    },
  ];

  return { teachers, subjects, topics, notes, questions, essays, templates };
}

function getGlobalStore(): PlatformStore {
  const g = globalThis as unknown as {
    __edumax_platform_store?: PlatformStore;
  };
  if (!g.__edumax_platform_store) {
    g.__edumax_platform_store = seedStore();
  }
  return g.__edumax_platform_store;
}

export function listSubjects(): Subject[] {
  return getGlobalStore().subjects;
}

export function getSubjectBySlug(subjectSlug: string): Subject | undefined {
  return getGlobalStore().subjects.find((s) => s.slug === subjectSlug);
}

export function listTopicsBySubjectSlug(subjectSlug: string): Topic[] {
  const subject = getSubjectBySlug(subjectSlug);
  if (!subject) return [];
  return getGlobalStore().topics.filter((t) => t.subjectId === subject.id);
}

export function listAllTopics(): Topic[] {
  return getGlobalStore().topics;
}

export function getTopicBySlug(topicSlug: string): Topic | undefined {
  return getGlobalStore().topics.find((t) => t.slug === topicSlug);
}

export function getTeacherById(teacherId: string): TeacherPublicProfile | undefined {
  return getGlobalStore().teachers.find((t) => t.id === teacherId);
}

export function listNotesByTopicSlug(topicSlug: string): Note[] {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  return getGlobalStore().notes.filter((n) => n.topicId === topic.id && n.published);
}

export function listRecentNotes(limit: number): Note[] {
  const published = getGlobalStore().notes.filter((n) => n.published);
  const sorted = [...published].sort(
    (a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
  );
  return sorted.slice(0, Math.max(0, limit));
}

export function listAllNotes(): Note[] {
  return getGlobalStore().notes;
}

export function getNoteById(noteId: string): Note | undefined {
  return getGlobalStore().notes.find((n) => n.id === noteId && n.published);
}

export function incrementNoteViews(noteId: string): Note | undefined {
  const store = getGlobalStore();
  const note = store.notes.find((n) => n.id === noteId);
  if (!note) return undefined;
  note.views += 1;
  note.dateUpdated = nowIso();
  return note;
}

export function createNote(input: {
  subjectSlug: string;
  topicSlug: string;
  title: string;
  content: string;
  featuredImageUrl?: string | null;
  published: boolean;
  authorId?: string;
}): Note {
  const store = getGlobalStore();
  const subject = getSubjectBySlug(input.subjectSlug);
  const topic = getTopicBySlug(input.topicSlug);
  if (!subject || !topic) {
    throw new Error("Invalid subject/topic");
  }
  const note: Note = {
    id: crypto.randomUUID(),
    title: input.title,
    content: input.content,
    subjectId: subject.id,
    topicId: topic.id,
    authorId: input.authorId ?? DEMO_TEACHER_ID,
    featuredImageUrl: input.featuredImageUrl ?? null,
    dateCreated: nowIso(),
    dateUpdated: null,
    views: 0,
    published: input.published,
  };
  store.notes.unshift(note);
  return note;
}

export function listQuestionsByTopicSlug(topicSlug: string): McqQuestion[] {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  return getGlobalStore().questions.filter((q) => q.topicId === topic.id);
}

export function listAllQuestions(): McqQuestion[] {
  return getGlobalStore().questions;
}

export function createMcqQuestion(input: Omit<McqQuestion, "id" | "subjectId" | "topicId" | "authorId" | "dateCreated"> & {
  subjectSlug: string;
  topicSlug: string;
  authorId?: string;
}): McqQuestion {
  const store = getGlobalStore();
  const subject = getSubjectBySlug(input.subjectSlug);
  const topic = getTopicBySlug(input.topicSlug);
  if (!subject || !topic) {
    throw new Error("Invalid subject/topic");
  }
  const question: McqQuestion = {
    id: crypto.randomUUID(),
    subjectId: subject.id,
    topicId: topic.id,
    authorId: input.authorId ?? DEMO_TEACHER_ID,
    questionText: input.questionText,
    questionImageUrl: input.questionImageUrl ?? null,
    optionAText: input.optionAText,
    optionAImageUrl: input.optionAImageUrl ?? null,
    optionBText: input.optionBText,
    optionBImageUrl: input.optionBImageUrl ?? null,
    optionCText: input.optionCText,
    optionCImageUrl: input.optionCImageUrl ?? null,
    optionDText: input.optionDText,
    optionDImageUrl: input.optionDImageUrl ?? null,
    correctAnswer: input.correctAnswer,
    explanation: input.explanation,
    dateCreated: nowIso(),
  };
  store.questions.unshift(question);
  return question;
}

export function getRandomQuestions(topicSlug: string, limit: number): McqQuestion[] {
  const all = listQuestionsByTopicSlug(topicSlug);
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(0, limit));
}

export function listEssaysByTopicSlug(topicSlug: string): EssayQuestion[] {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  return getGlobalStore().essays.filter((e) => e.topicId === topic.id);
}

export function listAllEssays(): EssayQuestion[] {
  return getGlobalStore().essays;
}

export function createEssayQuestion(input: {
  subjectSlug: string;
  topicSlug: string;
  questionText: string;
  referenceAnswer?: string | null;
  authorId?: string;
}): EssayQuestion {
  const store = getGlobalStore();
  const subject = getSubjectBySlug(input.subjectSlug);
  const topic = getTopicBySlug(input.topicSlug);
  if (!subject || !topic) {
    throw new Error("Invalid subject/topic");
  }
  const essay: EssayQuestion = {
    id: crypto.randomUUID(),
    subjectId: subject.id,
    topicId: topic.id,
    authorId: input.authorId ?? DEMO_TEACHER_ID,
    questionText: input.questionText,
    referenceAnswer: input.referenceAnswer ?? null,
    dateCreated: nowIso(),
  };
  store.essays.unshift(essay);
  return essay;
}

export function listTemplates(): PresentationTemplate[] {
  return getGlobalStore().templates;
}

export function getTemplateById(templateId: string): PresentationTemplate | undefined {
  return getGlobalStore().templates.find((t) => t.id === templateId);
}

export function incrementTemplateDownloads(templateId: string): PresentationTemplate | undefined {
  const store = getGlobalStore();
  const tpl = store.templates.find((t) => t.id === templateId);
  if (!tpl) return undefined;
  tpl.downloads += 1;
  return tpl;
}

export function createTemplate(input: {
  title: string;
  description: string;
  subjectCategory: string;
  fileUrl: string;
  previewImageUrl?: string | null;
  uploadedBy?: string;
}): PresentationTemplate {
  const store = getGlobalStore();
  const tpl: PresentationTemplate = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    subjectCategory: input.subjectCategory,
    fileUrl: input.fileUrl,
    previewImageUrl: input.previewImageUrl ?? null,
    uploadedBy: input.uploadedBy ?? DEMO_TEACHER_ID,
    dateUploaded: nowIso(),
    downloads: 0,
  };
  store.templates.unshift(tpl);
  return tpl;
}

export function getTopicResources(topicSlug: string): TopicResources | undefined {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return undefined;
  const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
  if (!subject) return undefined;
  return {
    topic,
    subject,
    notes: getGlobalStore().notes.filter((n) => n.topicId === topic.id && n.published),
    questions: getGlobalStore().questions.filter((q) => q.topicId === topic.id),
    essays: getGlobalStore().essays.filter((e) => e.topicId === topic.id),
    templates: getGlobalStore().templates.filter(
      (t) => t.subjectCategory === "General" || t.subjectCategory === subject.name
    ),
  };
}
