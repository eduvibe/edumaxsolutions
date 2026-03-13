
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
  title: z.string().min(3),
  content: z.string().min(20),
  featuredImageUrl: z.string().url().optional().or(z.literal("")),
  published: z.boolean().default(true),
});

export const mcqCreateSchema = z.object({
  subjectSlug: z.string().min(1),
  topicSlug: z.string().min(1),
  questionText: z.string().min(10),
  questionImageUrl: z.string().url().optional().or(z.literal("")),
  optionAText: z.string().min(1),
  optionAImageUrl: z.string().url().optional().or(z.literal("")),
  optionBText: z.string().min(1),
  optionBImageUrl: z.string().url().optional().or(z.literal("")),
  optionCText: z.string().min(1),
  optionCImageUrl: z.string().url().optional().or(z.literal("")),
  optionDText: z.string().min(1),
  optionDImageUrl: z.string().url().optional().or(z.literal("")),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(5),
});

export const essayCreateSchema = z.object({
  subjectSlug: z.string().min(1),
  topicSlug: z.string().min(1),
  questionText: z.string().min(10),
  referenceAnswer: z.string().optional().or(z.literal("")),
});

export const templateUploadSchema = z.object({
  title: z.string().min(3),
  subjectSlug: z.string().min(1),
  topicSlug: z.string().optional().or(z.literal("")),
  resourceType: z.enum(["slides", "worksheet", "scheme"]).default("slides"),
  description: z.string().min(10),
  fileUrl: z.string().url().optional().or(z.literal("")),
  previewImageUrl: z.string().url().optional().or(z.literal("")),
});
