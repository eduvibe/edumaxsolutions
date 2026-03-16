export type Id = string;

export type TeacherPublicProfile = {
  id: Id;
  name: string;
  profileImageUrl?: string | null;
  bio?: string | null;
  subjectSpecialty?: string | null;
  dateJoined: string;
  role: "teacher" | "admin";
};

export type Subject = {
  id: Id;
  name: string;
  slug: string;
  keyStages?: string[] | null;
  isNew?: boolean | null;
};

export type Topic = {
  id: Id;
  subjectId: Id;
  name: string;
  slug: string;
  description?: string | null;
  yearGroup?: string | null;
  thread?: string | null;
  lessonCount?: number | null;
  schoolSection?: "primary" | "jss" | "sss" | null;
};

export type Lesson = {
  id: Id;
  topicId: Id;
  lessonNumber: number;
  title: string;
  objective?: string | null;
};

export type Note = {
  id: Id;
  title: string;
  content: string;
  subjectId: Id;
  topicId: Id;
  lessonNumber?: number | null;
  authorId: Id;
  featuredImageUrl?: string | null;
  dateCreated: string;
  dateUpdated?: string | null;
  views: number;
  published: boolean;
};

export type McqOptionKey = "A" | "B" | "C" | "D";

export type RichTextContent = Record<string, unknown>;

export type McqQuestion = {
  id: Id;
  subjectId: Id;
  topicId: Id;
  lessonNumber?: number | null;
  authorId: Id;
  questionText: string;
  questionTextJson?: RichTextContent | null;
  questionImageUrl?: string | null;
  optionAText: string;
  optionATextJson?: RichTextContent | null;
  optionAImageUrl?: string | null;
  optionBText: string;
  optionBTextJson?: RichTextContent | null;
  optionBImageUrl?: string | null;
  optionCText: string;
  optionCTextJson?: RichTextContent | null;
  optionCImageUrl?: string | null;
  optionDText: string;
  optionDTextJson?: RichTextContent | null;
  optionDImageUrl?: string | null;
  correctAnswer: McqOptionKey;
  explanation: string;
  explanationJson?: RichTextContent | null;
  dateCreated: string;
};

export type EssayQuestion = {
  id: Id;
  subjectId: Id;
  topicId: Id;
  lessonNumber?: number | null;
  authorId: Id;
  questionText: string;
  referenceAnswer?: string | null;
  dateCreated: string;
};

export type PresentationTemplate = {
  id: Id;
  title: string;
  description: string;
  subjectCategory: string;
  subjectId?: Id | null;
  topicId?: Id | null;
  resourceType?: "slides" | "worksheet" | "scheme" | null;
  lessonNumber?: number | null;
  fileUrl: string;
  previewImageUrl?: string | null;
  uploadedBy: Id;
  dateUploaded: string;
  downloads: number;
};

export type LessonVideo = {
  id: Id;
  subjectId: Id;
  topicId: Id;
  lessonNumber: number;
  authorId: Id;
  title: string;
  videoUrl: string;
  dateCreated: string;
};

export type TopicResources = {
  topic: Topic;
  subject: Subject;
  notes: Note[];
  questions: McqQuestion[];
  essays: EssayQuestion[];
  templates: PresentationTemplate[];
};
