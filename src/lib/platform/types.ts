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
};

export type Topic = {
  id: Id;
  subjectId: Id;
  name: string;
  slug: string;
  description?: string | null;
};

export type Note = {
  id: Id;
  title: string;
  content: string;
  subjectId: Id;
  topicId: Id;
  authorId: Id;
  featuredImageUrl?: string | null;
  dateCreated: string;
  dateUpdated?: string | null;
  views: number;
  published: boolean;
};

export type McqOptionKey = "A" | "B" | "C" | "D";

export type McqQuestion = {
  id: Id;
  subjectId: Id;
  topicId: Id;
  authorId: Id;
  questionText: string;
  questionImageUrl?: string | null;
  optionAText: string;
  optionAImageUrl?: string | null;
  optionBText: string;
  optionBImageUrl?: string | null;
  optionCText: string;
  optionCImageUrl?: string | null;
  optionDText: string;
  optionDImageUrl?: string | null;
  correctAnswer: McqOptionKey;
  explanation: string;
  dateCreated: string;
};

export type EssayQuestion = {
  id: Id;
  subjectId: Id;
  topicId: Id;
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
  fileUrl: string;
  previewImageUrl?: string | null;
  uploadedBy: Id;
  dateUploaded: string;
  downloads: number;
};

export type TopicResources = {
  topic: Topic;
  subject: Subject;
  notes: Note[];
  questions: McqQuestion[];
  essays: EssayQuestion[];
  templates: PresentationTemplate[];
};

