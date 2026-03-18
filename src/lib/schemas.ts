
import { z } from "zod";

// Inquiry Form Schema
export const inquirySchema = z.object({
  schoolName: z.string().min(2, { message: "School name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }).optional().or(z.literal("")),
  service: z.enum(["CBT Software", "School Portal", "Website Design", "Academics Planning", "General Inquiry"], {
    required_error: "Please select a service.",
  }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }).max(500, { message: "Message cannot exceed 500 characters." }),
});

export const noteCreateSchema = z.object({
  subjectSlug: z.string().min(1),
  topicSlug: z.string().min(1),
  lessonNumber: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return null;
      if (typeof v === "string" && v.trim() === "") return null;
      if (typeof v === "string") return Number(v);
      return v;
    },
    z.number().int().min(1).nullable()
  ),
  title: z.string().min(3),
  content: z.string().min(20),
  featuredImageUrl: z.string().url().optional().or(z.literal("")),
  published: z.boolean().default(true),
});

export const topicNoteSuggestionCreateSchema = z.object({
  subjectSlug: z.string().min(1),
  topicSlug: z.string().min(1),
  lessonNumber: z.coerce.number().int().min(1),
  proposedContent: z.string().min(10),
  changeSummary: z.string().min(5).max(200),
});

export const suggestionVoteSchema = z.object({
  voteType: z.enum(["approve", "reject"]),
});

export const mcqCreateSchema = z.object({
  subjectSlug: z.string().min(1),
  topicSlug: z.string().min(1),
  lessonNumber: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return null;
      if (typeof v === "string" && v.trim() === "") return null;
      if (typeof v === "string") return Number(v);
      return v;
    },
    z.number().int().min(1).nullable()
  ),
  questionText: z.string().min(10),
  questionTextJson: z.record(z.unknown()).optional(),
  questionImageUrl: z.string().url().optional().or(z.literal("")),
  optionAText: z.string().min(1),
  optionATextJson: z.record(z.unknown()).optional(),
  optionAImageUrl: z.string().url().optional().or(z.literal("")),
  optionBText: z.string().min(1),
  optionBTextJson: z.record(z.unknown()).optional(),
  optionBImageUrl: z.string().url().optional().or(z.literal("")),
  optionCText: z.string().min(1),
  optionCTextJson: z.record(z.unknown()).optional(),
  optionCImageUrl: z.string().url().optional().or(z.literal("")),
  optionDText: z.string().min(1),
  optionDTextJson: z.record(z.unknown()).optional(),
  optionDImageUrl: z.string().url().optional().or(z.literal("")),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(5),
  explanationJson: z.record(z.unknown()).optional(),
});

export const essayCreateSchema = z.object({
  subjectSlug: z.string().min(1),
  topicSlug: z.string().min(1),
  lessonNumber: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return null;
      if (typeof v === "string" && v.trim() === "") return null;
      if (typeof v === "string") return Number(v);
      return v;
    },
    z.number().int().min(1).nullable()
  ),
  questionText: z.string().min(10),
  referenceAnswer: z.string().optional().or(z.literal("")),
});

export const templateUploadSchema = z.object({
  title: z.string().min(3),
  subjectSlug: z.string().min(1),
  topicSlug: z.string().optional().or(z.literal("")),
  lessonNumber: z.coerce.number().int().min(1).optional(),
  resourceType: z.enum(["slides", "worksheet", "scheme"]).default("slides"),
  description: z.string().min(10),
  fileUrl: z.string().url().optional().or(z.literal("")),
  previewImageUrl: z.string().url().optional().or(z.literal("")),
});
