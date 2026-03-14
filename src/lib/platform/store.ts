import type {
  EssayQuestion,
  Lesson,
  McqQuestion,
  Note,
  PresentationTemplate,
  Subject,
  TeacherPublicProfile,
  Topic,
  TopicResources,
} from "@/lib/platform/types";

type PlatformStore = {
  __version?: number;
  teachers: TeacherPublicProfile[];
  subjects: Subject[];
  topics: Topic[];
  lessons: Lesson[];
  notes: Note[];
  questions: McqQuestion[];
  essays: EssayQuestion[];
  templates: PresentationTemplate[];
};

const DEMO_TEACHER_ID = "teacher_demo_1";
const STORE_VERSION = 5;
const REQUIRED_SUBJECT_SLUGS = ["mathematics", "english", "basic-science", "computing"];

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
    { id: "sub_math", name: "Mathematics", slug: "mathematics", keyStages: ["KS2", "KS3", "KS4"], isNew: null },
    { id: "sub_eng", name: "English", slug: "english", keyStages: ["KS1", "KS2", "KS3", "KS4"], isNew: null },
    { id: "sub_comp", name: "Computing", slug: "computing", keyStages: ["KS1", "KS2", "KS3", "KS4"], isNew: true },
    { id: "sub_sci", name: "Basic Science", slug: "basic-science", keyStages: ["KS2", "KS3"], isNew: null },
    { id: "sub_soc", name: "Social Studies", slug: "social-studies", keyStages: ["KS2", "KS3"], isNew: null },
    { id: "sub_geo", name: "Geography", slug: "geography", keyStages: ["KS3", "KS4"], isNew: null },
    { id: "sub_hist", name: "History", slug: "history", keyStages: ["KS3", "KS4"], isNew: null },
    { id: "sub_fre", name: "French", slug: "french", keyStages: ["KS2", "KS3"], isNew: null },
    { id: "sub_re", name: "Religious Education", slug: "religious-education", keyStages: ["KS2", "KS3"], isNew: null },
    { id: "sub_phy", name: "Physics", slug: "physics", keyStages: ["KS3", "KS4"], isNew: true },
    { id: "sub_chem", name: "Chemistry", slug: "chemistry", keyStages: ["KS3", "KS4"], isNew: null },
    { id: "sub_bio", name: "Biology", slug: "biology", keyStages: ["KS3", "KS4"], isNew: null },
    { id: "sub_econ", name: "Economics", slug: "economics", keyStages: ["KS4"], isNew: null },
    { id: "sub_gov", name: "Government", slug: "government", keyStages: ["KS4"], isNew: null },
  ];

  const topics: Topic[] = [
    {
      id: "top_frac",
      subjectId: "sub_math",
      name: "Fractions",
      slug: "fractions",
      description: "Equivalent fractions, comparison, and basic operations.",
      yearGroup: "Year 4",
      thread: "Number",
      lessonCount: 16,
      schoolSection: "primary",
    },
    {
      id: "top_dec",
      subjectId: "sub_math",
      name: "Decimals",
      slug: "decimals",
      description: "Place value, comparison and operations with decimals.",
      yearGroup: "Year 5",
      thread: "Number",
      lessonCount: 14,
      schoolSection: "primary",
    },
    {
      id: "top_shapes",
      subjectId: "sub_math",
      name: "Shapes and Measurement",
      slug: "shapes-and-measurement",
      description: "Angles, perimeter, area, and basic geometry.",
      yearGroup: "Year 6",
      thread: "Geometry",
      lessonCount: 12,
      schoolSection: "primary",
    },
    {
      id: "top_gram",
      subjectId: "sub_eng",
      name: "Grammar basics",
      slug: "grammar-basics",
      description: "Parts of speech and sentence structure.",
      yearGroup: "Year 5",
      thread: "Writing",
      lessonCount: 14,
      schoolSection: "primary",
    },
    {
      id: "top_read",
      subjectId: "sub_eng",
      name: "Reading comprehension",
      slug: "reading-comprehension",
      description: "Inference, summary, and key details.",
      yearGroup: "Year 6",
      thread: "Reading",
      lessonCount: 12,
      schoolSection: "primary",
    },
    {
      id: "top_spell",
      subjectId: "sub_eng",
      name: "Spelling and vocabulary",
      slug: "spelling-and-vocabulary",
      description: "Spelling patterns and vocabulary building.",
      yearGroup: "Year 4",
      thread: "Writing",
      lessonCount: 10,
      schoolSection: "primary",
    },
    {
      id: "top_comp_basic",
      subjectId: "sub_comp",
      name: "Computer basics",
      slug: "computer-basics",
      description: "Parts of a computer, safe use, and typing skills.",
      yearGroup: "Year 4",
      thread: "Computing systems",
      lessonCount: 10,
      schoolSection: "primary",
    },
    {
      id: "top_comp_net",
      subjectId: "sub_comp",
      name: "Networks and the internet",
      slug: "networks-and-internet",
      description: "What the internet is and how data travels.",
      yearGroup: "Year 6",
      thread: "Networks",
      lessonCount: 8,
      schoolSection: "primary",
    },
    {
      id: "top_sci_plants",
      subjectId: "sub_sci",
      name: "Plants and animals",
      slug: "plants-and-animals",
      description: "Living things, habitats and life processes.",
      yearGroup: "Year 5",
      thread: "Biology",
      lessonCount: 12,
      schoolSection: "primary",
    },
    {
      id: "top_sci_energy_p",
      subjectId: "sub_sci",
      name: "Energy and forces",
      slug: "energy-and-forces-primary",
      description: "Pushes, pulls, energy and simple machines.",
      yearGroup: "Year 6",
      thread: "Physics",
      lessonCount: 10,
      schoolSection: "primary",
    },
    {
      id: "top_soc_comm",
      subjectId: "sub_soc",
      name: "Community and citizenship",
      slug: "community-and-citizenship",
      description: "Rules, rights, responsibilities and leadership.",
      yearGroup: "Year 5",
      thread: "Citizenship",
      lessonCount: 10,
      schoolSection: "primary",
    },
    {
      id: "top_soc_rights_j",
      subjectId: "sub_soc",
      name: "Rights and responsibilities",
      slug: "rights-and-responsibilities-jss",
      description: "Civic duties, leadership and community service.",
      yearGroup: "JSS 1",
      thread: "Citizenship",
      lessonCount: 8,
      schoolSection: "jss",
    },
    {
      id: "top_re_values",
      subjectId: "sub_re",
      name: "Values and moral lessons",
      slug: "values-and-morals",
      description: "Respect, honesty and empathy.",
      yearGroup: "Year 4",
      thread: "Values",
      lessonCount: 8,
      schoolSection: "primary",
    },
    {
      id: "top_re_world_j",
      subjectId: "sub_re",
      name: "World religions overview",
      slug: "world-religions-overview-jss",
      description: "Beliefs, practices and tolerance.",
      yearGroup: "JSS 2",
      thread: "Religion",
      lessonCount: 8,
      schoolSection: "jss",
    },
    {
      id: "top_fre_greet_p",
      subjectId: "sub_fre",
      name: "French greetings",
      slug: "french-greetings",
      description: "Greetings, numbers, colours and classroom phrases.",
      yearGroup: "Year 6",
      thread: "Basics",
      lessonCount: 6,
      schoolSection: "primary",
    },
    {
      id: "top_quad",
      subjectId: "sub_math",
      name: "Quadratic Equations",
      slug: "quadratic-equations",
      description: "Factorisation, completing the square, and the quadratic formula.",
      yearGroup: "JSS 3",
      thread: "Algebra",
      lessonCount: 12,
      schoolSection: "jss",
    },
    {
      id: "top_lin",
      subjectId: "sub_math",
      name: "Linear equations",
      slug: "linear-equations",
      description: "Solving and graphing linear relationships.",
      yearGroup: "JSS 2",
      thread: "Algebra",
      lessonCount: 10,
      schoolSection: "jss",
    },
    {
      id: "top_ratio",
      subjectId: "sub_math",
      name: "Ratio and proportion",
      slug: "ratio-and-proportion",
      description: "Rates, scale and proportional reasoning.",
      yearGroup: "JSS 1",
      thread: "Number",
      lessonCount: 10,
      schoolSection: "jss",
    },
    {
      id: "top_eng_write_j",
      subjectId: "sub_eng",
      name: "Creative writing",
      slug: "creative-writing-jss",
      description: "Narratives, descriptive writing and structure.",
      yearGroup: "JSS 1",
      thread: "Writing",
      lessonCount: 10,
      schoolSection: "jss",
    },
    {
      id: "top_newton",
      subjectId: "sub_phy",
      name: "Newton's Laws",
      slug: "newtons-laws",
      description: "Forces, inertia, and motion in one dimension.",
      yearGroup: "JSS 2",
      thread: "Forces",
      lessonCount: 10,
      schoolSection: "jss",
    },
    {
      id: "top_motion",
      subjectId: "sub_phy",
      name: "Motion and speed",
      slug: "motion-and-speed",
      description: "Distance-time and speed calculations.",
      yearGroup: "JSS 1",
      thread: "Motion",
      lessonCount: 8,
      schoolSection: "jss",
    },
    {
      id: "top_basic_sci_lab",
      subjectId: "sub_sci",
      name: "Laboratory safety",
      slug: "laboratory-safety",
      description: "Safety rules, equipment and basic measurements.",
      yearGroup: "JSS 1",
      thread: "Scientific method",
      lessonCount: 6,
      schoolSection: "jss",
    },
    {
      id: "top_basic_sci_cells",
      subjectId: "sub_sci",
      name: "Cells and living things",
      slug: "cells-and-living-things",
      description: "Cells, classification and living processes.",
      yearGroup: "JSS 2",
      thread: "Biology",
      lessonCount: 10,
      schoolSection: "jss",
    },
    {
      id: "top_bio_body_j",
      subjectId: "sub_bio",
      name: "Human body systems",
      slug: "human-body-systems-jss",
      description: "Digestive, respiratory and circulatory systems.",
      yearGroup: "JSS 2",
      thread: "Biology",
      lessonCount: 10,
      schoolSection: "jss",
    },
    {
      id: "top_chem_states_j",
      subjectId: "sub_chem",
      name: "States of matter",
      slug: "states-of-matter-jss",
      description: "Solids, liquids, gases and particle theory.",
      yearGroup: "JSS 1",
      thread: "Chemistry basics",
      lessonCount: 8,
      schoolSection: "jss",
    },
    {
      id: "top_comp_algo",
      subjectId: "sub_comp",
      name: "Algorithms and data structures",
      slug: "algorithms-and-data-structures",
      description: "Algorithms, flowcharts and simple data structures.",
      yearGroup: "JSS 2",
      thread: "Algorithms",
      lessonCount: 12,
      schoolSection: "jss",
    },
    {
      id: "top_comp_media",
      subjectId: "sub_comp",
      name: "Creating media",
      slug: "creating-media",
      description: "Documents, presentations and digital creativity.",
      yearGroup: "JSS 1",
      thread: "Creative computing",
      lessonCount: 8,
      schoolSection: "jss",
    },
    {
      id: "top_geo_maps",
      subjectId: "sub_geo",
      name: "Maps and map reading",
      slug: "maps-and-map-reading",
      description: "Scale, direction, symbols and coordinates.",
      yearGroup: "JSS 1",
      thread: "Geographical skills",
      lessonCount: 8,
      schoolSection: "jss",
    },
    {
      id: "top_hist_nigeria",
      subjectId: "sub_hist",
      name: "Nigeria in history",
      slug: "nigeria-in-history",
      description: "Pre-colonial societies and key events.",
      yearGroup: "JSS 2",
      thread: "National history",
      lessonCount: 10,
      schoolSection: "jss",
    },
    {
      id: "top_fre_intro",
      subjectId: "sub_fre",
      name: "Introduction to French",
      slug: "intro-to-french",
      description: "Greetings, numbers and simple conversations.",
      yearGroup: "JSS 1",
      thread: "Basics",
      lessonCount: 8,
      schoolSection: "jss",
    },
    {
      id: "top_mole",
      subjectId: "sub_chem",
      name: "Mole Concept",
      slug: "mole-concept",
      description: "Molar mass, Avogadro number, and stoichiometry basics.",
      yearGroup: "SSS 1",
      thread: "Stoichiometry",
      lessonCount: 8,
      schoolSection: "sss",
    },
    {
      id: "top_trig_s",
      subjectId: "sub_math",
      name: "Trigonometry",
      slug: "trigonometry-sss",
      description: "Trig ratios, angles and applications.",
      yearGroup: "SSS 1",
      thread: "Trigonometry",
      lessonCount: 12,
      schoolSection: "sss",
    },
    {
      id: "top_prog_s",
      subjectId: "sub_comp",
      name: "Programming fundamentals",
      slug: "programming-fundamentals-sss",
      description: "Variables, conditions, loops and problem solving.",
      yearGroup: "SSS 1",
      thread: "Programming",
      lessonCount: 12,
      schoolSection: "sss",
    },
    {
      id: "top_thermo",
      subjectId: "sub_phy",
      name: "Heat and temperature",
      slug: "heat-and-temperature",
      description: "Temperature scales, heat transfer and measurement.",
      yearGroup: "SSS 1",
      thread: "Thermal physics",
      lessonCount: 10,
      schoolSection: "sss",
    },
    {
      id: "top_org_chem",
      subjectId: "sub_chem",
      name: "Organic chemistry",
      slug: "organic-chemistry",
      description: "Hydrocarbons and functional groups.",
      yearGroup: "SSS 2",
      thread: "Organic chemistry",
      lessonCount: 12,
      schoolSection: "sss",
    },
    {
      id: "top_genetics",
      subjectId: "sub_bio",
      name: "Genetics",
      slug: "genetics",
      description: "Inheritance, DNA and variation.",
      yearGroup: "SSS 2",
      thread: "Genetics",
      lessonCount: 10,
      schoolSection: "sss",
    },
    {
      id: "top_ec_macro",
      subjectId: "sub_econ",
      name: "Macroeconomics basics",
      slug: "macroeconomics-basics",
      description: "GDP, inflation, unemployment and policy.",
      yearGroup: "SSS 2",
      thread: "Macroeconomics",
      lessonCount: 10,
      schoolSection: "sss",
    },
    {
      id: "top_gov_const",
      subjectId: "sub_gov",
      name: "Constitution and government",
      slug: "constitution-and-government",
      description: "Constitution, arms of government and elections.",
      yearGroup: "SSS 1",
      thread: "Civics",
      lessonCount: 10,
      schoolSection: "sss",
    },
    {
      id: "top_eng_essay_s",
      subjectId: "sub_eng",
      name: "Essay writing",
      slug: "essay-writing-sss",
      description: "Argument structure, coherence and exam technique.",
      yearGroup: "SSS 1",
      thread: "Writing",
      lessonCount: 12,
      schoolSection: "sss",
    },
    {
      id: "top_geo_climate",
      subjectId: "sub_geo",
      name: "Climate and weather",
      slug: "climate-and-weather",
      description: "Climate zones, weather elements and instruments.",
      yearGroup: "SSS 1",
      thread: "Physical geography",
      lessonCount: 10,
      schoolSection: "sss",
    },
  ];

  const lessons: Lesson[] = [
    {
      id: "les_comp_media_1",
      topicId: "top_comp_media",
      lessonNumber: 1,
      title: "Digital devices",
      objective: "I can describe how digital devices work.",
    },
    {
      id: "les_comp_media_2",
      topicId: "top_comp_media",
      lessonNumber: 2,
      title: "Designing a digital device",
      objective: "I can design a digital device.",
    },
    {
      id: "les_comp_media_3",
      topicId: "top_comp_media",
      lessonNumber: 3,
      title: "Input and output",
      objective: "I can explain how input and output devices are used.",
    },
    {
      id: "les_comp_media_4",
      topicId: "top_comp_media",
      lessonNumber: 4,
      title: "Storing data",
      objective: "I can compare different ways to store data.",
    },
    {
      id: "les_comp_media_5",
      topicId: "top_comp_media",
      lessonNumber: 5,
      title: "Sharing information safely",
      objective: "I can describe how to share information safely online.",
    },
    {
      id: "les_comp_media_6",
      topicId: "top_comp_media",
      lessonNumber: 6,
      title: "Review and quiz",
      objective: "I can review learning and complete a quiz.",
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
      lessonNumber: null,
      authorId: DEMO_TEACHER_ID,
      featuredImageUrl: null,
      dateCreated: nowIso(),
      dateUpdated: null,
      views: 0,
      published: true,
    },
    {
      id: "note_comp_media_1",
      title: "Digital devices",
      content:
        "Digital devices use input, processing, storage and output.\n\nKey terms:\n- Input\n- Output\n- Storage\n- Processor\n\nExamples: phones, laptops, tablets.",
      subjectId: "sub_comp",
      topicId: "top_comp_media",
      lessonNumber: 1,
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
      lessonNumber: null,
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
    {
      id: "q_comp_media_1",
      subjectId: "sub_comp",
      topicId: "top_comp_media",
      lessonNumber: 1,
      authorId: DEMO_TEACHER_ID,
      questionText: "Which component is responsible for processing instructions in a computer?",
      questionImageUrl: null,
      optionAText: "CPU",
      optionAImageUrl: null,
      optionBText: "Monitor",
      optionBImageUrl: null,
      optionCText: "Keyboard",
      optionCImageUrl: null,
      optionDText: "Mouse",
      optionDImageUrl: null,
      correctAnswer: "A",
      explanation: "The CPU (processor) executes instructions.",
      dateCreated: nowIso(),
    },
  ];

  const essays: EssayQuestion[] = [
    {
      id: "e_1",
      subjectId: "sub_phy",
      topicId: "top_newton",
      lessonNumber: null,
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
      subjectId: null,
      topicId: null,
      resourceType: "slides",
      lessonNumber: null,
      fileUrl: "https://example.com/templates/lesson-plan.pptx",
      previewImageUrl: null,
      uploadedBy: DEMO_TEACHER_ID,
      dateUploaded: nowIso(),
      downloads: 0,
    },
    {
      id: "t_comp_media_slides_1",
      title: "Digital devices — slides",
      description: "Lesson slides for digital devices.",
      subjectCategory: "Computing",
      subjectId: "sub_comp",
      topicId: "top_comp_media",
      resourceType: "slides",
      lessonNumber: 1,
      fileUrl: "https://example.com/templates/digital-devices-slides.pptx",
      previewImageUrl: null,
      uploadedBy: DEMO_TEACHER_ID,
      dateUploaded: nowIso(),
      downloads: 0,
    },
    {
      id: "t_comp_media_ws_1",
      title: "Digital devices — worksheet",
      description: "Worksheet for lesson practice.",
      subjectCategory: "Computing",
      subjectId: "sub_comp",
      topicId: "top_comp_media",
      resourceType: "worksheet",
      lessonNumber: 1,
      fileUrl: "https://example.com/templates/digital-devices-worksheet.pdf",
      previewImageUrl: null,
      uploadedBy: DEMO_TEACHER_ID,
      dateUploaded: nowIso(),
      downloads: 0,
    },
  ];

  return { __version: STORE_VERSION, teachers, subjects, topics, lessons, notes, questions, essays, templates };
}

function getGlobalStore(): PlatformStore {
  const g = globalThis as unknown as {
    __edumax_platform_store?: PlatformStore;
  };
  const existing = g.__edumax_platform_store;
  const missingRequired =
    !existing?.subjects?.length ||
    !Array.isArray(existing.lessons) ||
    !REQUIRED_SUBJECT_SLUGS.every((slug) => existing.subjects.some((s) => s.slug === slug));
  if (
    !existing ||
    existing.__version !== STORE_VERSION ||
    existing.subjects.length === 0 ||
    existing.topics.length === 0 ||
    missingRequired
  ) {
    g.__edumax_platform_store = seedStore();
  }
  return g.__edumax_platform_store ?? seedStore();
}

export function listSubjects(): Subject[] {
  return getGlobalStore().subjects;
}

export function getSubjectBySlug(subjectSlug: string): Subject | undefined {
  return getGlobalStore().subjects.find((s) => s.slug === subjectSlug);
}

export function listSubjectsBySchoolSection(section: "primary" | "jss" | "sss"): Subject[] {
  const required = section === "primary" ? ["KS1", "KS2"] : section === "jss" ? ["KS3"] : ["KS4"];
  return listSubjects().filter((s) => required.some((k) => (s.keyStages ?? []).includes(k)));
}

export function listTopicsBySubjectSlug(subjectSlug: string): Topic[] {
  const subject = getSubjectBySlug(subjectSlug);
  if (!subject) return [];
  return getGlobalStore().topics.filter((t) => t.subjectId === subject.id);
}

export function listTopicsBySubjectAndSection(subjectSlug: string, section: "primary" | "jss" | "sss"): Topic[] {
  return listTopicsBySubjectSlug(subjectSlug).filter((t) => (t.schoolSection ?? null) === section);
}

export function listLessonsByTopicSlug(topicSlug: string): Lesson[] {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  const stored = getGlobalStore().lessons.filter((l) => l.topicId === topic.id);
  if (stored.length) {
    return [...stored].sort((a, b) => a.lessonNumber - b.lessonNumber);
  }
  const count = topic.lessonCount ?? 0;
  return Array.from({ length: Math.max(0, count) }, (_, i) => ({
    id: `${topic.id}_lesson_${i + 1}`,
    topicId: topic.id,
    lessonNumber: i + 1,
    title: `Lesson ${i + 1}`,
    objective: null,
  }));
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

export function listNotesByTopicAndLesson(topicSlug: string, lessonNumber: number): Note[] {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  return getGlobalStore().notes.filter(
    (n) => n.topicId === topic.id && n.published && (n.lessonNumber ?? null) === lessonNumber
  );
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
  lessonNumber?: number | null;
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
    lessonNumber: input.lessonNumber ?? null,
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

export function listQuestionsByTopicAndLesson(topicSlug: string, lessonNumber: number): McqQuestion[] {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  return getGlobalStore().questions.filter((q) => q.topicId === topic.id && (q.lessonNumber ?? null) === lessonNumber);
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
    lessonNumber: input.lessonNumber ?? null,
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

export function getRandomQuestions(topicSlug: string, limit: number, lessonNumber?: number): McqQuestion[] {
  const all =
    typeof lessonNumber === "number"
      ? listQuestionsByTopicAndLesson(topicSlug, lessonNumber)
      : listQuestionsByTopicSlug(topicSlug);
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
  lessonNumber?: number | null;
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
    lessonNumber: input.lessonNumber ?? null,
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
  subjectSlug: string;
  topicSlug?: string | null;
  resourceType?: "slides" | "worksheet" | "scheme" | null;
  lessonNumber?: number | null;
  fileUrl: string;
  previewImageUrl?: string | null;
  uploadedBy?: string;
}): PresentationTemplate {
  const store = getGlobalStore();
  const subject = getSubjectBySlug(input.subjectSlug);
  const topic = input.topicSlug ? getTopicBySlug(input.topicSlug) : undefined;
  if (!subject) {
    throw new Error("Invalid subject");
  }
  const tpl: PresentationTemplate = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description,
    subjectCategory: subject.name,
    subjectId: subject.id,
    topicId: topic?.id ?? null,
    resourceType: input.resourceType ?? "slides",
    lessonNumber: input.lessonNumber ?? null,
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
    templates: getGlobalStore().templates.filter((t) => {
      const subjectOk = (t.subjectId ?? null) ? t.subjectId === subject.id : true;
      const topicOk = (t.topicId ?? null) ? t.topicId === topic.id : true;
      return subjectOk && topicOk;
    }),
  };
}

export function listSubjectsByKeyStage(keyStage: string): Subject[] {
  return listSubjects().filter((s) => (s.keyStages ?? []).includes(keyStage));
}

export function getTopicLessonCount(topicSlug: string): number {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return 0;
  const explicit = topic.lessonCount ?? null;
  if (typeof explicit === "number") return explicit;
  const notes = getGlobalStore().notes.filter((n) => n.topicId === topic.id && n.published).length;
  const questions = getGlobalStore().questions.filter((q) => q.topicId === topic.id).length;
  const essays = getGlobalStore().essays.filter((e) => e.topicId === topic.id).length;
  return notes + questions + essays;
}

export function getSubjectStatsBySlug(subjectSlug: string): { units: number; lessons: number } {
  const topics = listTopicsBySubjectSlug(subjectSlug);
  const units = topics.length;
  const lessons = topics.reduce((acc, t) => acc + getTopicLessonCount(t.slug), 0);
  return { units, lessons };
}

export function getSubjectStatsBySlugAndSection(subjectSlug: string, section: "primary" | "jss" | "sss"): {
  units: number;
  lessons: number;
} {
  const topics = listTopicsBySubjectAndSection(subjectSlug, section);
  const units = topics.length;
  const lessons = topics.reduce((acc, t) => acc + getTopicLessonCount(t.slug), 0);
  return { units, lessons };
}

export function createTopic(input: {
  subjectSlug: string;
  name: string;
  description?: string | null;
  yearGroup?: string | null;
  thread?: string | null;
  lessonCount?: number | null;
  schoolSection?: "primary" | "jss" | "sss" | null;
}): Topic {
  const store = getGlobalStore();
  const subject = getSubjectBySlug(input.subjectSlug);
  if (!subject) {
    throw new Error("Invalid subject");
  }
  const slugBase = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = `${slugBase || "topic"}-${Math.random().toString(16).slice(2, 6)}`;
  const topic: Topic = {
    id: crypto.randomUUID(),
    subjectId: subject.id,
    name: input.name,
    slug,
    description: input.description ?? null,
    yearGroup: input.yearGroup ?? null,
    thread: input.thread ?? null,
    lessonCount: input.lessonCount ?? null,
    schoolSection: input.schoolSection ?? null,
  };
  store.topics.unshift(topic);
  return topic;
}
