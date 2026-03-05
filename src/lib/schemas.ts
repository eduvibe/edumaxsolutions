
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
