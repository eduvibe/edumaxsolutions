
"use server";

import { z } from "zod";
import nodemailer from "nodemailer";
import { chatbotAssistant, type ChatbotAssistantInput } from "@/ai/flows/chatbot-assistant";
import { PRODUCT_DOCUMENTATION, EMAIL_USER, EMAIL_PASS } from "@/constants";
import type { InquiryFormState } from "./schemas";
import { inquirySchema } from "./schemas";


export async function submitInquiry(
  prevState: InquiryFormState,
  formData: FormData
): Promise<InquiryFormState> {
  try {
    const validatedFields = inquirySchema.safeParse({
      schoolName: formData.get("schoolName"),
      contactPerson: formData.get("contactPerson"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      message: formData.get("message"),
    });

    if (!validatedFields.success) {
      return {
        message: "Validation failed. Please check your input.",
        status: "error",
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    console.log("Inquiry Submitted (intended for edumaxsolutions.ng@gmail.com):", validatedFields.data);

    const { schoolName, contactPerson, email, phone, message } = validatedFields.data;

    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail", // You can use other services or SMTP
      auth: {
        user: EMAIL_USER, // Your Gmail address from environment variables
        pass: EMAIL_PASS, // Your Gmail app password from environment variables
      },
    });

    // Email content
    const mailOptions = {
      from: EMAIL_USER, // Sender address
      to: "edumaxsolutions.ng@gmail.com", // Recipient address
      subject: `New Inquiry from ${schoolName}`, // Subject line
      text: `
        New Inquiry Received:

        School Name: ${schoolName}
        Contact Person: ${contactPerson}
        Email: ${email}
        Phone: ${phone}
        Message:
        ${message}
      `, // Plain text body
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    console.log("Inquiry email sent successfully.");

    // Simulate success delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      message: "Thank you for your inquiry! We will get back to you soon.",
      status: "success",
    };
  } catch (error) {
    console.error("Inquiry submission error:", error);
    return {
      message: "An unexpected error occurred. Please try again later.",
      status: "error",
    };
  }
}


// Chatbot Action
export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

export async function getChatbotResponse(history: ChatMessage[], question: string): Promise<ChatMessage> {
  // For simplicity, we're not using the full history in the prompt here, 
  // but in a real scenario, you might want to pass some context.
  // The current `chatbotAssistant` flow is designed for single-turn questions based on docs.
  
  const input: ChatbotAssistantInput = {
    question: question,
    productDocumentation: PRODUCT_DOCUMENTATION,
  };

  try {
    const result = await chatbotAssistant(input);
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content: result.answer,
    };
  } catch (error) {
    console.error("Chatbot error:", error);
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "I'm sorry, I encountered an error and couldn't process your request. Please try again later.",
    };
  }
}
