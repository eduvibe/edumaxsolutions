
import { z } from "zod";

// Inquiry Form Schema
export const inquirySchema = z.object({
  schoolName: z.string().min(2, { message: "School name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }).optional().or(z.literal("")),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }).max(500, { message: "Message cannot exceed 500 characters." }),
});

export type InquiryFormState = {
  message: string;
  status: "success" | "error" | "idle";
  errors?: {
    schoolName?: string[];
    contactPerson?: string[];
    email?: string[];
    phone?: string[];
    message?: string[];
  };
};
