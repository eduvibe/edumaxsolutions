
"use server";

import { chatbotAssistant, type ChatbotAssistantInput } from "@/ai/flows/chatbot-assistant";
import { PRODUCT_DOCUMENTATION } from "@/constants";


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
