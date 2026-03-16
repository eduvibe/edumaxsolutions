import type {
  EssayQuestion,
  Lesson,
  LessonVideo,
  McqQuestion,
  Note,
  PresentationTemplate,
  Subject,
  TeacherPublicProfile,
  Topic,
  TopicResources,
} from "@/lib/platform/types";
import { curriculumLessonsByTopicSlug } from "@/lib/platform/curriculum";
import { getPlatformPublicEnv } from "@/lib/platform/env";
import { getSupabaseServerClient } from "@/lib/platform/supabase";

type PlatformStore = {
  __version?: number;
  teachers: TeacherPublicProfile[];
  subjects: Subject[];
  topics: Topic[];
  lessons: Lesson[];
  videos: LessonVideo[];
  notes: Note[];
  questions: McqQuestion[];
  essays: EssayQuestion[];
  templates: PresentationTemplate[];
};

const DEMO_TEACHER_ID = "teacher_demo_1";
const STORE_VERSION = 7;
const REQUIRED_SUBJECT_SLUGS = ["mathematics", "english", "basic-science", "computing"];

function nowIso() {
  return new Date().toISOString();
}

function isSupabaseEnabled() {
  const env = getPlatformPublicEnv();
  return env.platformMode === "supabase" && env.supabaseConfigured;
}

type DbRow = Record<string, unknown>;

function pick(row: DbRow, keys: string[]) {
  for (const k of keys) {
    const v = row[k];
    if (typeof v !== "undefined") return v;
  }
  return undefined;
}

function mapTemplateRowToTemplate(row: DbRow): PresentationTemplate {
  const resourceTypeRaw = String(pick(row, ["resource_type", "resourceType"]) ?? "slides");
  const resourceType: PresentationTemplate["resourceType"] =
    resourceTypeRaw === "slides" || resourceTypeRaw === "worksheet" || resourceTypeRaw === "scheme"
      ? resourceTypeRaw
      : "slides";

  return {
    id: String(pick(row, ["id"]) ?? ""),
    title: String(pick(row, ["title"]) ?? ""),
    description: String(pick(row, ["description"]) ?? ""),
    subjectCategory: String(pick(row, ["subject_category", "subjectCategory"]) ?? "General"),
    subjectId: null,
    topicId: null,
    resourceType,
    lessonNumber:
      typeof pick(row, ["lesson_number"]) === "number"
        ? (pick(row, ["lesson_number"]) as number)
        : (pick(row, ["lessonNumber"]) as number | null | undefined) ?? null,
    fileUrl: String(pick(row, ["file_url", "fileUrl"]) ?? ""),
    previewImageUrl: (pick(row, ["preview_image_url", "previewImageUrl"]) as string | null | undefined) ?? null,
    uploadedBy: String(pick(row, ["uploaded_by", "uploadedBy"]) ?? DEMO_TEACHER_ID),
    dateUploaded: String(pick(row, ["date_uploaded", "dateUploaded"]) ?? nowIso()),
    downloads: Number(pick(row, ["downloads"]) ?? 0),
  };
}

function mapNoteRowToNote(row: DbRow, subjectId: string, topicId: string): Note {
  return {
    id: String(pick(row, ["id"]) ?? ""),
    title: String(pick(row, ["title"]) ?? ""),
    content: String(pick(row, ["content"]) ?? ""),
    subjectId,
    topicId,
    lessonNumber:
      typeof pick(row, ["lesson_number"]) === "number"
        ? (pick(row, ["lesson_number"]) as number)
        : (pick(row, ["lessonNumber"]) as number | null | undefined) ?? null,
    authorId: String(pick(row, ["author_id", "authorId"]) ?? DEMO_TEACHER_ID),
    featuredImageUrl: (pick(row, ["featured_image_url", "featuredImageUrl"]) as string | null | undefined) ?? null,
    dateCreated: String(pick(row, ["date_created", "dateCreated"]) ?? nowIso()),
    dateUpdated: (pick(row, ["date_updated", "dateUpdated"]) as string | null | undefined) ?? null,
    views: Number(pick(row, ["views"]) ?? 0),
    published: Boolean(pick(row, ["published"]) ?? true),
  };
}

function mapMcqRowToQuestion(row: DbRow, subjectId: string, topicId: string): McqQuestion {
  const correctRaw = String(pick(row, ["correct_answer", "correctAnswer"]) ?? "A");
  const correctAnswer: McqQuestion["correctAnswer"] =
    correctRaw === "A" || correctRaw === "B" || correctRaw === "C" || correctRaw === "D" ? correctRaw : "A";

  return {
    id: String(pick(row, ["id"]) ?? ""),
    subjectId,
    topicId,
    lessonNumber:
      typeof pick(row, ["lesson_number"]) === "number"
        ? (pick(row, ["lesson_number"]) as number)
        : (pick(row, ["lessonNumber"]) as number | null | undefined) ?? null,
    authorId: String(pick(row, ["author_id", "authorId"]) ?? DEMO_TEACHER_ID),
    questionText: String(pick(row, ["question_text", "questionText"]) ?? ""),
    questionImageUrl: (pick(row, ["question_image_url", "questionImageUrl"]) as string | null | undefined) ?? null,
    optionAText: String(pick(row, ["option_a_text", "optionAText"]) ?? ""),
    optionAImageUrl: (pick(row, ["option_a_image_url", "optionAImageUrl"]) as string | null | undefined) ?? null,
    optionBText: String(pick(row, ["option_b_text", "optionBText"]) ?? ""),
    optionBImageUrl: (pick(row, ["option_b_image_url", "optionBImageUrl"]) as string | null | undefined) ?? null,
    optionCText: String(pick(row, ["option_c_text", "optionCText"]) ?? ""),
    optionCImageUrl: (pick(row, ["option_c_image_url", "optionCImageUrl"]) as string | null | undefined) ?? null,
    optionDText: String(pick(row, ["option_d_text", "optionDText"]) ?? ""),
    optionDImageUrl: (pick(row, ["option_d_image_url", "optionDImageUrl"]) as string | null | undefined) ?? null,
    correctAnswer,
    explanation: String(pick(row, ["explanation"]) ?? ""),
    dateCreated: String(pick(row, ["date_created", "dateCreated"]) ?? nowIso()),
  };
}

function mapEssayRowToEssay(row: DbRow, subjectId: string, topicId: string): EssayQuestion {
  return {
    id: String(pick(row, ["id"]) ?? ""),
    subjectId,
    topicId,
    lessonNumber:
      typeof pick(row, ["lesson_number"]) === "number"
        ? (pick(row, ["lesson_number"]) as number)
        : (pick(row, ["lessonNumber"]) as number | null | undefined) ?? null,
    authorId: String(pick(row, ["author_id", "authorId"]) ?? DEMO_TEACHER_ID),
    questionText: String(pick(row, ["question_text", "questionText"]) ?? ""),
    referenceAnswer: (pick(row, ["reference_answer", "referenceAnswer"]) as string | null | undefined) ?? null,
    dateCreated: String(pick(row, ["date_created", "dateCreated"]) ?? nowIso()),
  };
}

function mapVideoRowToVideo(row: DbRow, subjectId: string, topicId: string): LessonVideo {
  return {
    id: String(pick(row, ["id"]) ?? ""),
    subjectId,
    topicId,
    lessonNumber: Number(pick(row, ["lesson_number", "lessonNumber"]) ?? 0),
    authorId: String(pick(row, ["author_id", "authorId"]) ?? DEMO_TEACHER_ID),
    title: String(pick(row, ["title"]) ?? ""),
    videoUrl: String(pick(row, ["video_url", "videoUrl"]) ?? ""),
    dateCreated: String(pick(row, ["date_created", "dateCreated"]) ?? nowIso()),
  };
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

  for (const t of topics) {
    const defs = curriculumLessonsByTopicSlug[t.slug];
    if (defs) t.lessonCount = defs.length;
  }

  const lessons: Lesson[] = Object.entries(curriculumLessonsByTopicSlug).flatMap(([topicSlug, defs]) => {
    const topic = topics.find((t) => t.slug === topicSlug);
    if (!topic) return [];
    return defs.map((d, idx) => ({
      id: `les_${topic.id}_${idx + 1}`,
      topicId: topic.id,
      lessonNumber: idx + 1,
      title: d.title,
      objective: d.objective ?? null,
    }));
  });

  const videos: LessonVideo[] = [
    {
      id: "vid_comp_media_1",
      subjectId: "sub_comp",
      topicId: "top_comp_media",
      lessonNumber: 1,
      authorId: DEMO_TEACHER_ID,
      title: "Digital devices (recorded lesson)",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      dateCreated: nowIso(),
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

  return { __version: STORE_VERSION, teachers, subjects, topics, lessons, videos, notes, questions, essays, templates };
}

function getGlobalStore(): PlatformStore {
  const g = globalThis as unknown as {
    __edumax_platform_store?: PlatformStore;
  };
  const existing = g.__edumax_platform_store;
  const missingRequired =
    !existing?.subjects?.length ||
    !Array.isArray(existing.lessons) ||
    !Array.isArray(existing.videos) ||
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
  return [];
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

export async function listNotesByTopicSlug(topicSlug: string): Promise<Note[]> {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  if (!isSupabaseEnabled()) {
    return getGlobalStore().notes.filter((n) => n.topicId === topic.id && n.published);
  }
  const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
  if (!subject) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("topic_slug", topic.slug)
    .eq("published", true)
    .order("date_created", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => mapNoteRowToNote(row, subject.id, topic.id));
}

export async function listRecentNotes(limit: number): Promise<Note[]> {
  if (!isSupabaseEnabled()) {
    const published = getGlobalStore().notes.filter((n) => n.published);
    const sorted = [...published].sort(
      (a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()
    );
    return sorted.slice(0, Math.max(0, limit));
  }
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("published", true)
    .order("date_created", { ascending: false })
    .limit(Math.max(0, limit));
  if (error || !data) return [];
  return data
    .map((row) => {
      const topicSlug = String(row.topic_slug ?? row.topicSlug ?? "");
      const topic = getTopicBySlug(topicSlug);
      if (!topic) return null;
      const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
      if (!subject) return null;
      return mapNoteRowToNote(row, subject.id, topic.id);
    })
    .filter((n): n is Note => Boolean(n));
}

export async function listAllNotes(): Promise<Note[]> {
  if (!isSupabaseEnabled()) return getGlobalStore().notes;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("notes").select("*").order("date_created", { ascending: false });
  if (error || !data) return [];
  return data
    .map((row) => {
      const topicSlug = String(row.topic_slug ?? row.topicSlug ?? "");
      const topic = getTopicBySlug(topicSlug);
      if (!topic) return null;
      const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
      if (!subject) return null;
      return mapNoteRowToNote(row, subject.id, topic.id);
    })
    .filter((n): n is Note => Boolean(n));
}

export async function listNotesByTopicAndLesson(topicSlug: string, lessonNumber: number): Promise<Note[]> {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  if (!isSupabaseEnabled()) {
    return getGlobalStore().notes.filter(
      (n) => n.topicId === topic.id && n.published && (n.lessonNumber ?? null) === lessonNumber
    );
  }
  const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
  if (!subject) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("topic_slug", topic.slug)
    .eq("lesson_number", lessonNumber)
    .eq("published", true)
    .order("date_created", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => mapNoteRowToNote(row, subject.id, topic.id));
}

export async function getNoteById(noteId: string): Promise<Note | undefined> {
  if (!isSupabaseEnabled()) {
    return getGlobalStore().notes.find((n) => n.id === noteId && n.published);
  }
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("notes").select("*").eq("id", noteId).maybeSingle();
  if (error || !data) return undefined;
  const topicSlug = String(data.topic_slug ?? data.topicSlug ?? "");
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return undefined;
  const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
  if (!subject) return undefined;
  return mapNoteRowToNote(data, subject.id, topic.id);
}

export async function incrementNoteViews(noteId: string): Promise<Note | undefined> {
  if (!isSupabaseEnabled()) {
    const store = getGlobalStore();
    const note = store.notes.find((n) => n.id === noteId);
    if (!note) return undefined;
    note.views += 1;
    note.dateUpdated = nowIso();
    return note;
  }
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.rpc("increment_note_views", { note_id: noteId });
  if (error) return undefined;
  return await getNoteById(noteId);
}

export async function createNote(input: {
  subjectSlug: string;
  topicSlug: string;
  title: string;
  content: string;
  featuredImageUrl?: string | null;
  published: boolean;
  authorId?: string;
  lessonNumber?: number | null;
}): Promise<Note> {
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
  if (isSupabaseEnabled()) {
    throw new Error("Supabase mode enabled: create notes via API using tutor auth");
  }
  store.notes.unshift(note);
  return note;
}

export async function listQuestionsByTopicSlug(topicSlug: string): Promise<McqQuestion[]> {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  if (!isSupabaseEnabled()) return getGlobalStore().questions.filter((q) => q.topicId === topic.id);
  const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
  if (!subject) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("mcq_questions")
    .select("*")
    .eq("topic_slug", topic.slug)
    .order("date_created", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => mapMcqRowToQuestion(row, subject.id, topic.id));
}

export async function listQuestionsByTopicAndLesson(topicSlug: string, lessonNumber: number): Promise<McqQuestion[]> {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  if (!isSupabaseEnabled()) {
    return getGlobalStore().questions.filter((q) => q.topicId === topic.id && (q.lessonNumber ?? null) === lessonNumber);
  }
  const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
  if (!subject) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("mcq_questions")
    .select("*")
    .eq("topic_slug", topic.slug)
    .eq("lesson_number", lessonNumber)
    .order("date_created", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => mapMcqRowToQuestion(row, subject.id, topic.id));
}

export async function listVideosByTopicAndLesson(topicSlug: string, lessonNumber: number): Promise<LessonVideo[]> {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  if (!isSupabaseEnabled()) {
    return getGlobalStore().videos.filter((v) => v.topicId === topic.id && v.lessonNumber === lessonNumber);
  }
  const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
  if (!subject) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("lesson_videos")
    .select("*")
    .eq("topic_slug", topic.slug)
    .eq("lesson_number", lessonNumber)
    .order("date_created", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => mapVideoRowToVideo(row, subject.id, topic.id));
}

export async function listVideosByTopicSlug(topicSlug: string): Promise<LessonVideo[]> {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  if (!isSupabaseEnabled()) {
    return getGlobalStore().videos.filter((v) => v.topicId === topic.id);
  }
  const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
  if (!subject) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("lesson_videos")
    .select("*")
    .eq("topic_slug", topic.slug)
    .order("date_created", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => mapVideoRowToVideo(row, subject.id, topic.id));
}

export async function listAllQuestions(): Promise<McqQuestion[]> {
  if (!isSupabaseEnabled()) return getGlobalStore().questions;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("mcq_questions").select("*").order("date_created", { ascending: false });
  if (error || !data) return [];
  return data
    .map((row) => {
      const topicSlug = String(row.topic_slug ?? row.topicSlug ?? "");
      const topic = getTopicBySlug(topicSlug);
      if (!topic) return null;
      const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
      if (!subject) return null;
      return mapMcqRowToQuestion(row, subject.id, topic.id);
    })
    .filter((q): q is McqQuestion => Boolean(q));
}

export async function createMcqQuestion(input: Omit<McqQuestion, "id" | "subjectId" | "topicId" | "authorId" | "dateCreated"> & {
  subjectSlug: string;
  topicSlug: string;
  authorId?: string;
}): Promise<McqQuestion> {
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
  if (isSupabaseEnabled()) {
    throw new Error("Supabase mode enabled: create questions via API using tutor auth");
  }
  store.questions.unshift(question);
  return question;
}

export async function getRandomQuestions(topicSlug: string, limit: number, lessonNumber?: number): Promise<McqQuestion[]> {
  const all = typeof lessonNumber === "number"
    ? await listQuestionsByTopicAndLesson(topicSlug, lessonNumber)
    : await listQuestionsByTopicSlug(topicSlug);
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(0, limit));
}

export async function listEssaysByTopicSlug(topicSlug: string): Promise<EssayQuestion[]> {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return [];
  if (!isSupabaseEnabled()) return getGlobalStore().essays.filter((e) => e.topicId === topic.id);
  const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
  if (!subject) return [];
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("essay_questions").select("*").eq("topic_slug", topic.slug).order("date_created", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => mapEssayRowToEssay(row, subject.id, topic.id));
}

export async function listAllEssays(): Promise<EssayQuestion[]> {
  if (!isSupabaseEnabled()) return getGlobalStore().essays;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("essay_questions").select("*").order("date_created", { ascending: false });
  if (error || !data) return [];
  return data
    .map((row) => {
      const topicSlug = String(row.topic_slug ?? row.topicSlug ?? "");
      const topic = getTopicBySlug(topicSlug);
      if (!topic) return null;
      const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
      if (!subject) return null;
      return mapEssayRowToEssay(row, subject.id, topic.id);
    })
    .filter((e): e is EssayQuestion => Boolean(e));
}

export async function createEssayQuestion(input: {
  subjectSlug: string;
  topicSlug: string;
  questionText: string;
  referenceAnswer?: string | null;
  authorId?: string;
  lessonNumber?: number | null;
}): Promise<EssayQuestion> {
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
  if (isSupabaseEnabled()) {
    throw new Error("Supabase mode enabled: create essay questions via API using tutor auth");
  }
  store.essays.unshift(essay);
  return essay;
}

export async function listTemplates(): Promise<PresentationTemplate[]> {
  if (!isSupabaseEnabled()) return getGlobalStore().templates;
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("templates").select("*").order("date_uploaded", { ascending: false });
  if (error || !data) return [];
  return data.map(mapTemplateRowToTemplate);
}

export async function getTemplateById(templateId: string): Promise<PresentationTemplate | undefined> {
  if (!isSupabaseEnabled()) return getGlobalStore().templates.find((t) => t.id === templateId);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("templates").select("*").eq("id", templateId).maybeSingle();
  if (error || !data) return undefined;
  return mapTemplateRowToTemplate(data);
}

export async function incrementTemplateDownloads(templateId: string): Promise<PresentationTemplate | undefined> {
  if (!isSupabaseEnabled()) {
    const store = getGlobalStore();
    const tpl = store.templates.find((t) => t.id === templateId);
    if (!tpl) return undefined;
    tpl.downloads += 1;
    return tpl;
  }
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.rpc("increment_template_downloads", { template_id: templateId });
  if (error) return undefined;
  return await getTemplateById(templateId);
}

export async function createTemplate(input: {
  title: string;
  description: string;
  subjectSlug: string;
  topicSlug?: string | null;
  resourceType?: "slides" | "worksheet" | "scheme" | null;
  lessonNumber?: number | null;
  fileUrl: string;
  previewImageUrl?: string | null;
  uploadedBy?: string;
}): Promise<PresentationTemplate> {
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
  if (isSupabaseEnabled()) {
    throw new Error("Supabase mode enabled: create templates via API using tutor auth");
  }
  store.templates.unshift(tpl);
  return tpl;
}

export async function getTopicResources(topicSlug: string): Promise<TopicResources | undefined> {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return undefined;
  const subject = getGlobalStore().subjects.find((s) => s.id === topic.subjectId);
  if (!subject) return undefined;
  if (!isSupabaseEnabled()) {
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
  const [notes, questions, essays] = await Promise.all([
    listNotesByTopicSlug(topic.slug),
    listQuestionsByTopicSlug(topic.slug),
    listEssaysByTopicSlug(topic.slug),
  ]);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("topic_slug", topic.slug)
    .order("date_uploaded", { ascending: false });
  const templates = error || !data ? [] : data.map(mapTemplateRowToTemplate);
  return { topic, subject, notes, questions, essays, templates };
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
