"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Bot, MessageSquare } from "lucide-react";
import { ChatbotDialog } from "./ChatbotDialog";

export function ChatbotTrigger() {
  const [isChatOpen, setIsChatOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground z-50 animate-bounce hover:animate-none"
        onClick={() => setIsChatOpen(true)}
        aria-label="Open Chatbot"
      >
        <Bot className="h-7 w-7" />
      </Button>
      <ChatbotDialog isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
    </>
  );
}
